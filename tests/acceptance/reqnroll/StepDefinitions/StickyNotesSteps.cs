using System.Net;
using System.Text;
using System.Text.Json;
using Reqnroll;
using Xunit;

namespace AcceptanceTests.StepDefinitions;

/// <summary>
/// @api step definitions for specs/sticky-notes.feature — the board save/load REST
/// contract. These drive the deployed service over HTTP (no mocking); the base URL
/// comes from API_BASE_URL. A fresh instance is created per scenario, so the
/// instance fields below hold per-scenario state.
///
/// Every pattern is anchored with ^...$ so Reqnroll treats it as a regular
/// expression (an unanchored "(.+?)" would be parsed as a Cucumber Expression,
/// where parentheses mean "optional text" rather than a capture group).
/// </summary>
[Binding]
public sealed class StickyNotesSteps
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _client;

    private HttpResponseMessage? _lastSaveResponse;
    private BoardDto? _loadedBoard;
    private BoardDto? _baselineBoard;

    public StickyNotesSteps()
    {
        var baseUrl = Environment.GetEnvironmentVariable("API_BASE_URL") ?? "http://localhost:8080";
        _client = new HttpClient { BaseAddress = new Uri(baseUrl) };
    }

    // ----- Given -----

    [Given(@"^no board has been saved$")]
    public async Task GivenNoBoardHasBeenSaved()
    {
        // No reset endpoint exists; an empty save yields the same observable state
        // as a fresh server — an empty board.
        await SaveBoardAsync();
    }

    [Given(@"^a board with notes ""(.+?)"" and ""(.+?)"" has been saved$")]
    public async Task GivenABoardWithTwoNamedNotesHasBeenSaved(string first, string second)
    {
        await SaveBoardAsync(new NoteDto(first, 0, 0), new NoteDto(second, 0, 0));
        Assert.True(_lastSaveResponse!.IsSuccessStatusCode);
    }

    [Given(@"^a board with notes has been saved$")]
    public async Task GivenABoardWithNotesHasBeenSaved()
    {
        await SaveBoardAsync(new NoteDto("seed", 0, 0));
        Assert.True(_lastSaveResponse!.IsSuccessStatusCode);
    }

    // ----- When -----

    [When(@"^a client saves a board with note ""(.+?)"" at position \((\d+), (\d+)\) and note ""(.+?)"" at position \((\d+), (\d+)\)$")]
    public async Task WhenAClientSavesTwoPositionedNotes(string t1, double x1, double y1, string t2, double x2, double y2)
    {
        await SaveBoardAsync(new NoteDto(t1, x1, y1), new NoteDto(t2, x2, y2));
    }

    [When(@"^a client loads the board$")]
    public async Task WhenAClientLoadsTheBoard()
    {
        _loadedBoard = await LoadBoardAsync();
    }

    [When(@"^a client saves a board containing only note ""(.+?)""$")]
    public async Task WhenAClientSavesOnlyOneNote(string text)
    {
        await SaveBoardAsync(new NoteDto(text, 0, 0));
    }

    [When(@"^a client saves a board with no notes$")]
    public async Task WhenAClientSavesAnEmptyBoard()
    {
        await SaveBoardAsync();
    }

    [When(@"^a client saves a board containing a note of (\d+) characters$")]
    public async Task WhenAClientSavesAnOversizedNote(int length)
    {
        _baselineBoard = await LoadBoardAsync();
        await SaveBoardAsync(new NoteDto(new string('a', length), 0, 0));
    }

    // ----- Then -----

    [Then(@"^the save succeeds$")]
    public void ThenTheSaveSucceeds()
    {
        Assert.True(
            _lastSaveResponse!.IsSuccessStatusCode,
            $"Expected a successful save but got HTTP {(int)_lastSaveResponse.StatusCode}.");
    }

    [Then(@"^loading the board returns note ""(.+?)"" at position \((\d+), (\d+)\) and note ""(.+?)"" at position \((\d+), (\d+)\)$")]
    public async Task ThenLoadingReturnsTwoPositionedNotes(string t1, double x1, double y1, string t2, double x2, double y2)
    {
        var board = await LoadBoardAsync();
        Assert.Collection(
            board.Notes,
            n => Assert.Equal((t1, x1, y1), (n.Text, n.X, n.Y)),
            n => Assert.Equal((t2, x2, y2), (n.Text, n.X, n.Y)));
    }

    [Then(@"^the response is an empty board$")]
    public void ThenTheResponseIsAnEmptyBoard()
    {
        Assert.NotNull(_loadedBoard);
        Assert.Empty(_loadedBoard!.Notes);
    }

    [Then(@"^loading the board returns only note ""(.+?)""$")]
    public async Task ThenLoadingReturnsOnlyNote(string text)
    {
        var board = await LoadBoardAsync();
        var note = Assert.Single(board.Notes);
        Assert.Equal(text, note.Text);
    }

    [Then(@"^loading the board returns an empty board$")]
    public async Task ThenLoadingReturnsAnEmptyBoard()
    {
        var board = await LoadBoardAsync();
        Assert.Empty(board.Notes);
    }

    [Then(@"^the save is rejected with a validation error$")]
    public async Task ThenTheSaveIsRejectedWithAValidationError()
    {
        Assert.Equal(HttpStatusCode.BadRequest, _lastSaveResponse!.StatusCode);
        var body = await _lastSaveResponse.Content.ReadAsStringAsync();
        Assert.Contains("error", body, StringComparison.OrdinalIgnoreCase);
    }

    [Then(@"^the previously stored board is unchanged$")]
    public async Task ThenThePreviouslyStoredBoardIsUnchanged()
    {
        var current = await LoadBoardAsync();
        var expected = _baselineBoard ?? new BoardDto([]);
        Assert.Equal(expected.Notes.Count, current.Notes.Count);
        for (var i = 0; i < expected.Notes.Count; i++)
        {
            Assert.Equal(expected.Notes[i].Text, current.Notes[i].Text);
        }
    }

    // ----- HTTP helpers -----

    private async Task SaveBoardAsync(params NoteDto[] notes)
    {
        var payload = JsonSerializer.Serialize(new BoardDto([.. notes]), Json);
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        _lastSaveResponse = await _client.PutAsync("/api/board", content);
    }

    private async Task<BoardDto> LoadBoardAsync()
    {
        var response = await _client.GetAsync("/api/board");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<BoardDto>(body, Json) ?? new BoardDto([]);
    }

    private sealed record NoteDto(string Text, double X, double Y, int Z = 0, string Id = "");

    private sealed record BoardDto(List<NoteDto> Notes);
}
