using StickyNotes.Auth;

namespace StickyNotes.Tests.Auth;

public class AuthServiceTests
{
    private readonly InMemoryUserStore _users = new();
    private readonly AuthService _auth;

    public AuthServiceTests() =>
        _auth = new AuthService(_users, new PasswordHasher(), new SessionStore(new SystemClock()));

    // ----- registration -----

    [Fact]
    public void Register_WithValidCredentials_SucceedsAndIssuesAToken()
    {
        var outcome = _auth.Register("ada", "correct-horse");

        Assert.True(outcome.Succeeded);
        Assert.False(string.IsNullOrEmpty(outcome.Token));
        Assert.NotNull(_users.Find("ada"));
    }

    [Fact]
    public void Register_StoresTheNormalizedUsername()
    {
        _auth.Register("Ada", "correct-horse");

        Assert.NotNull(_users.Find("ada"));
    }

    [Fact]
    public void Register_RejectsADuplicateUsernameCaseInsensitively()
    {
        _auth.Register("ada", "correct-horse");

        var outcome = _auth.Register("ADA", "another-password");

        Assert.False(outcome.Succeeded);
        Assert.Null(outcome.Token);
        Assert.NotEmpty(outcome.Errors);
    }

    [Fact]
    public void Register_RejectsAPasswordShorterThanEight()
    {
        var outcome = _auth.Register("bob", "1234567");

        Assert.False(outcome.Succeeded);
        Assert.Null(_users.Find("bob"));
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("this-username-is-far-too-long-abc")]
    [InlineData("bad@name")]
    public void Register_RejectsAMalformedUsername(string username)
    {
        var outcome = _auth.Register(username, "valid-password");

        Assert.False(outcome.Succeeded);
    }

    // ----- sign-in -----

    [Fact]
    public void SignIn_WithCorrectCredentials_SucceedsAndIssuesAToken()
    {
        _auth.Register("ada", "correct-horse");

        var outcome = _auth.SignIn("ada", "correct-horse");

        Assert.True(outcome.Succeeded);
        Assert.False(string.IsNullOrEmpty(outcome.Token));
    }

    [Fact]
    public void SignIn_MatchesTheUsernameCaseInsensitively()
    {
        _auth.Register("Ada", "correct-horse");

        var outcome = _auth.SignIn("ada", "correct-horse");

        Assert.True(outcome.Succeeded);
    }

    [Fact]
    public void SignIn_WithWrongPassword_Fails()
    {
        _auth.Register("ada", "correct-horse");

        var outcome = _auth.SignIn("ada", "wrong-password");

        Assert.False(outcome.Succeeded);
        Assert.Null(outcome.Token);
    }

    [Fact]
    public void SignIn_WithUnknownUsername_Fails()
    {
        var outcome = _auth.SignIn("nobody", "any-password");

        Assert.False(outcome.Succeeded);
        Assert.Null(outcome.Token);
    }

    // ----- session lifetime -----

    [Fact]
    public void Authenticate_ResolvesAValidTokenToItsUsername()
    {
        var token = _auth.Register("ada", "correct-horse").Token!;

        Assert.Equal("ada", _auth.Authenticate(token));
    }

    [Fact]
    public void SignOut_InvalidatesTheToken()
    {
        var token = _auth.Register("ada", "correct-horse").Token!;

        _auth.SignOut(token);

        Assert.Null(_auth.Authenticate(token));
    }
}
