using System.Net;
using System.Text;
using System.Text.Json;
using Reqnroll;
using Xunit;

namespace AcceptanceTests.StepDefinitions;

/// <summary>
/// @api step definitions for specs/user-authentication.feature — the auth REST
/// contract (register / login / logout / me). These drive the deployed service
/// over HTTP (no mocking); the base URL comes from API_BASE_URL. A fresh instance
/// is created per scenario, so the instance fields below hold per-scenario state.
///
/// Hermetic usernames: the service keeps one in-memory account store for the whole
/// run, so scenarios must not collide on a username. Every username is given a
/// per-scenario unique suffix (<see cref="_suffix"/>) — EXCEPT the username-policy
/// scenarios, which pass the sentinel password "valid-password" precisely because
/// the username itself is what is under test and must reach the server verbatim
/// (a suffix would, e.g., make a deliberately-too-short name valid). See
/// <see cref="Scoped"/>.
///
/// Every pattern is anchored with ^...$ so Reqnroll treats it as a regular
/// expression, matching the StickyNotesSteps convention.
/// </summary>
[Binding]
public sealed class UserAuthenticationSteps
{
    private const string DefaultPassword = "correct-horse";

    // The username-policy scenarios use this password so we can tell "the username
    // is under test, send it verbatim" from "namespace this username for isolation".
    private const string RawUsernamePassword = "valid-password";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _client;
    private readonly string _suffix = Guid.NewGuid().ToString("N")[..8];

    private HttpResponseMessage? _lastResponse;
    private string _lastBody = string.Empty;
    private string? _token;                 // last token issued by register/login
    private string _lastUsername = string.Empty;
    private string _lastPassword = string.Empty;

    public UserAuthenticationSteps()
    {
        var baseUrl = Environment.GetEnvironmentVariable("API_BASE_URL") ?? "http://localhost:8080";
        _client = new HttpClient { BaseAddress = new Uri(baseUrl) };
    }

    // ----- Given -----

    [Given(@"^an account exists with username ""([^""]+)""$")]
    public Task GivenAnAccountExists(string username) =>
        RegisterAsync(Scoped(username, DefaultPassword), DefaultPassword);

    [Given(@"^an account exists with username ""([^""]+)"" and password ""([^""]+)""$")]
    public Task GivenAnAccountExistsWithPassword(string username, string password) =>
        RegisterAsync(Scoped(username, password), password);

    [Given(@"^no account exists with username ""([^""]+)""$")]
    public void GivenNoAccountExists(string username)
    {
        // A per-scenario suffix guarantees this name was never registered; nothing to do.
        _ = Scoped(username, "any-password");
    }

    [Given(@"^a user is signed in$")]
    public async Task GivenAUserIsSignedIn()
    {
        await RegisterAsync(Namespaced("user"), DefaultPassword);
        Assert.True(_lastResponse!.IsSuccessStatusCode, "Expected the sign-up that establishes a session to succeed.");
        Assert.False(string.IsNullOrEmpty(_token), "Expected a session token from sign-up.");
    }

    // ----- When -----

    [When(@"^a visitor registers with username ""([^""]+)"" and password ""([^""]+)""$")]
    public Task WhenAVisitorRegisters(string username, string password) =>
        RegisterAsync(Scoped(username, password), password);

    [When(@"^a visitor registers with username ""([^""]+)"" and an 8-character password$")]
    public Task WhenAVisitorRegistersWithAnEightCharPassword(string username) =>
        RegisterAsync(Namespaced(username), "pass1234"); // exactly 8 characters

    [When(@"^a visitor registers with username ""([^""]+)"" and a 7-character password$")]
    public Task WhenAVisitorRegistersWithASevenCharPassword(string username) =>
        RegisterAsync(Namespaced(username), "pass123");  // exactly 7 characters

    [When(@"^a user signs in with username ""([^""]+)"" and password ""([^""]+)""$")]
    public Task WhenAUserSignsIn(string username, string password) =>
        LoginAsync(Scoped(username, password), password);

    [When(@"^an authenticated request is made with the session credential$")]
    public Task WhenAnAuthenticatedRequestIsMade() => GetMeAsync(_token);

    [When(@"^a request is made without any session credential$")]
    public Task WhenARequestIsMadeWithoutCredential() => GetMeAsync(null);

    [When(@"^the user signs out$")]
    public async Task WhenTheUserSignsOut()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {_token}");
        _lastResponse = await _client.SendAsync(request);
    }

    [When(@"^a request is made with the same session credential$")]
    public Task WhenARequestIsMadeWithTheSameCredential() => GetMeAsync(_token);

    // ----- Then -----

    [Then(@"^the registration succeeds$")]
    public void ThenTheRegistrationSucceeds() => AssertStatus(HttpStatusCode.OK);

    [Then(@"^the sign-in succeeds$")]
    public void ThenTheSignInSucceeds() => AssertStatus(HttpStatusCode.OK);

    [Then(@"^the response contains a session credential$")]
    public void ThenTheResponseContainsASessionCredential() =>
        Assert.False(string.IsNullOrEmpty(_token), $"Expected a token in the response body, got: {_lastBody}");

    [Then(@"^the registration is rejected with a validation error$")]
    public void ThenTheRegistrationIsRejected()
    {
        AssertStatus(HttpStatusCode.BadRequest);
        Assert.Contains("error", _lastBody, StringComparison.OrdinalIgnoreCase);
    }

    [Then(@"^no account is created$")]
    public async Task ThenNoAccountIsCreated()
    {
        Assert.False(_lastResponse!.IsSuccessStatusCode);
        // Prove it: a sign-in with the just-attempted credentials must fail.
        await LoginAsync(_lastUsername, _lastPassword);
        AssertStatus(HttpStatusCode.Unauthorized);
    }

    [Then(@"^no second account is created$")]
    public void ThenNoSecondAccountIsCreated() => AssertStatus(HttpStatusCode.BadRequest);

    [Then(@"^the sign-in is rejected with the message ""([^""]+)""$")]
    public void ThenTheSignInIsRejectedWithMessage(string message)
    {
        AssertStatus(HttpStatusCode.Unauthorized);
        Assert.Contains(message, _lastBody, StringComparison.OrdinalIgnoreCase);
    }

    [Then(@"^no session credential is issued$")]
    public void ThenNoSessionCredentialIsIssued() =>
        Assert.True(string.IsNullOrEmpty(_token), $"Expected no token, but got one in: {_lastBody}");

    [Then(@"^the request is authorised$")]
    public void ThenTheRequestIsAuthorised() => AssertStatus(HttpStatusCode.OK);

    [Then(@"^the request is rejected as unauthenticated$")]
    public void ThenTheRequestIsRejectedAsUnauthenticated() => AssertStatus(HttpStatusCode.Unauthorized);

    // ----- HTTP helpers -----

    private async Task RegisterAsync(string username, string password)
    {
        _lastUsername = username;
        _lastPassword = password;
        await PostCredentialsAsync("/api/auth/register", username, password);
    }

    private async Task LoginAsync(string username, string password)
    {
        _lastUsername = username;
        _lastPassword = password;
        await PostCredentialsAsync("/api/auth/login", username, password);
    }

    private async Task PostCredentialsAsync(string path, string username, string password)
    {
        var payload = JsonSerializer.Serialize(new { username, password }, Json);
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        _lastResponse = await _client.PostAsync(path, content);
        _lastBody = await _lastResponse.Content.ReadAsStringAsync();
        _token = TryReadToken(_lastBody);
    }

    private async Task GetMeAsync(string? token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        if (!string.IsNullOrEmpty(token))
        {
            request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");
        }
        _lastResponse = await _client.SendAsync(request);
        _lastBody = await _lastResponse.Content.ReadAsStringAsync();
    }

    private void AssertStatus(HttpStatusCode expected) =>
        Assert.True(
            _lastResponse!.StatusCode == expected,
            $"Expected HTTP {(int)expected} but got {(int)_lastResponse.StatusCode}. Body: {_lastBody}");

    private static string? TryReadToken(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }
        try
        {
            using var doc = JsonDocument.Parse(body);
            return doc.RootElement.TryGetProperty("token", out var token) ? token.GetString() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    // Per-scenario isolation: namespace a username unless it is a username-policy
    // test input (those arrive with the sentinel password and must be sent verbatim).
    private string Scoped(string username, string password) =>
        password == RawUsernamePassword ? username : Namespaced(username);

    private string Namespaced(string username) => $"{username}-{_suffix}";
    // (regex note: quoted captures use [^"]+ so a "x" group never spans into a
    //  following "...and password \"y\"" clause — that would make Givens ambiguous.)
}
