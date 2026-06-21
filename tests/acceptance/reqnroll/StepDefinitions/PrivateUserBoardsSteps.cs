using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Reqnroll;
using Xunit;

namespace AcceptanceTests.StepDefinitions;

/// <summary>
/// @api step definitions for specs/private-user-boards.feature — the owner-scoped
/// board contract. The board now requires a bearer session; each logical user is
/// registered as a unique account (per-scenario suffix) so the shared in-memory
/// backend stays hermetic, and several users can coexist for the isolation case.
///
/// Step wording is board-specific ("the save is accepted", "the board comes back
/// empty", "the board request is rejected …") so these bindings never collide with
/// StickyNotesSteps / UserAuthenticationSteps, which match across all classes.
///
/// Every pattern is anchored with ^...$ so Reqnroll treats it as a regular expression.
/// </summary>
[Binding]
public sealed class PrivateUserBoardsSteps
{
    private const string DefaultUser = "owner";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _client;
    private readonly string _suffix = Guid.NewGuid().ToString("N")[..8];
    private readonly Dictionary<string, string> _tokens = new(); // logical name -> bearer token

    private HttpResponseMessage? _lastResponse;
    private string _lastBody = string.Empty;

    public PrivateUserBoardsSteps()
    {
        var baseUrl = Environment.GetEnvironmentVariable("API_BASE_URL") ?? "http://localhost:8080";
        _client = new HttpClient { BaseAddress = new Uri(baseUrl) };
    }

    // ----- Given -----

    [Given(@"^a signed-in user$")]
    public Task GivenASignedInUser() => RegisterAsync(DefaultUser);

    [Given(@"^a signed-in user who has not saved anything$")]
    public Task GivenASignedInUserWhoHasNotSaved() => RegisterAsync(DefaultUser);

    [Given(@"^two signed-in users, ""([^""]+)"" and ""([^""]+)""$")]
    public async Task GivenTwoSignedInUsers(string first, string second)
    {
        await RegisterAsync(first);
        await RegisterAsync(second);
    }

    // ----- When -----

    [When(@"^the user saves a board with note ""([^""]+)""$")]
    public Task WhenTheUserSavesANote(string text) => SaveNoteAsync(DefaultUser, text);

    [When(@"^""([^""]+)"" saves a board with note ""([^""]+)""$")]
    public Task WhenANamedUserSavesANote(string name, string text) => SaveNoteAsync(name, text);

    [When(@"^the user loads the board$")]
    public Task WhenTheUserLoadsTheBoard() => LoadAsync(DefaultUser);

    [When(@"^the board is loaded without a session credential$")]
    public Task WhenTheBoardIsLoadedWithoutASession() => SendBoardAsync(HttpMethod.Get, token: null);

    [When(@"^a board is saved without a session credential$")]
    public Task WhenABoardIsSavedWithoutASession() =>
        SendBoardAsync(HttpMethod.Put, token: null, body: new { notes = Array.Empty<object>() });

    [When(@"^the board is loaded with an invalid session credential$")]
    public Task WhenTheBoardIsLoadedWithAnInvalidSession() =>
        SendBoardAsync(HttpMethod.Get, token: "not-a-real-token");

    // ----- Then -----

    [Then(@"^the save is accepted$")]
    public void ThenTheSaveIsAccepted() => AssertStatus(HttpStatusCode.OK);

    [Then(@"^loading the board for that user returns note ""([^""]+)""$")]
    public Task ThenLoadingForThatUserReturnsNote(string text) => AssertOnlyNoteAsync(DefaultUser, text);

    [Then(@"^loading the board for ""([^""]+)"" returns only ""([^""]+)""$")]
    public Task ThenLoadingForNamedUserReturnsOnly(string name, string text) => AssertOnlyNoteAsync(name, text);

    [Then(@"^the board comes back empty$")]
    public async Task ThenTheBoardComesBackEmpty()
    {
        var board = ParseBoard();
        Assert.Empty(board.Notes);
        await Task.CompletedTask;
    }

    [Then(@"^the board request is rejected as unauthenticated$")]
    public void ThenTheBoardRequestIsRejected() => AssertStatus(HttpStatusCode.Unauthorized);

    [Then(@"^no board is returned$")]
    public void ThenNoBoardIsReturned() =>
        Assert.DoesNotContain("notes", _lastBody, StringComparison.OrdinalIgnoreCase);

    // ----- helpers -----

    private async Task RegisterAsync(string name)
    {
        var username = $"{name}-{_suffix}";
        var payload = JsonSerializer.Serialize(new { username, password = "correct-horse" }, Json);
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/auth/register", content);
        response.EnsureSuccessStatusCode();
        var token = JsonDocument.Parse(await response.Content.ReadAsStringAsync())
            .RootElement.GetProperty("token").GetString();
        _tokens[name] = token!;
    }

    private Task SaveNoteAsync(string name, string text) =>
        SendBoardAsync(HttpMethod.Put, _tokens[name], new { notes = new[] { new { text } } });

    private Task LoadAsync(string name) => SendBoardAsync(HttpMethod.Get, _tokens[name]);

    private async Task SendBoardAsync(HttpMethod method, string? token, object? body = null)
    {
        using var request = new HttpRequestMessage(method, "/api/board");
        if (!string.IsNullOrEmpty(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        if (body is not null)
        {
            request.Content = new StringContent(JsonSerializer.Serialize(body, Json), Encoding.UTF8, "application/json");
        }
        _lastResponse = await _client.SendAsync(request);
        _lastBody = await _lastResponse.Content.ReadAsStringAsync();
    }

    private async Task AssertOnlyNoteAsync(string name, string text)
    {
        await LoadAsync(name);
        AssertStatus(HttpStatusCode.OK);
        var note = Assert.Single(ParseBoard().Notes);
        Assert.Equal(text, note.Text);
    }

    private BoardDto ParseBoard() =>
        JsonSerializer.Deserialize<BoardDto>(_lastBody, Json) ?? new BoardDto([]);

    private void AssertStatus(HttpStatusCode expected) =>
        Assert.True(
            _lastResponse!.StatusCode == expected,
            $"Expected HTTP {(int)expected} but got {(int)_lastResponse.StatusCode}. Body: {_lastBody}");

    private sealed record NoteDto(string Text, double X, double Y, int Z = 0, string Id = "");

    private sealed record BoardDto(List<NoteDto> Notes);
}
