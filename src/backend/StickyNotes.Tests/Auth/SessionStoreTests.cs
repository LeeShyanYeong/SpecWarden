using StickyNotes.Auth;

namespace StickyNotes.Tests.Auth;

public class SessionStoreTests
{
    private readonly MutableClock _clock = new(DateTimeOffset.UnixEpoch);
    private readonly SessionStore _sessions;

    public SessionStoreTests() => _sessions = new SessionStore(_clock);

    [Fact]
    public void Issue_ReturnsANonEmptyToken() =>
        Assert.False(string.IsNullOrEmpty(_sessions.Issue("ada")));

    [Fact]
    public void Validate_ReturnsTheUsernameForALiveToken()
    {
        var token = _sessions.Issue("ada");

        Assert.Equal("ada", _sessions.Validate(token));
    }

    [Theory]
    [InlineData("never-issued")]
    [InlineData("")]
    [InlineData(null)]
    public void Validate_ReturnsNullForAnUnknownToken(string? token) =>
        Assert.Null(_sessions.Validate(token));

    [Fact]
    public void Validate_ReturnsNullOnceIdlePastTheTimeout()
    {
        var token = _sessions.Issue("ada");

        _clock.Advance(SessionStore.IdleTimeout + TimeSpan.FromSeconds(1));

        Assert.Null(_sessions.Validate(token));
    }

    [Fact]
    public void Validate_SlidesTheWindowSoActiveUseKeepsTheSessionAlive()
    {
        var token = _sessions.Issue("ada");

        // Use it just before each timeout would elapse, three times over.
        for (var i = 0; i < 3; i++)
        {
            _clock.Advance(SessionStore.IdleTimeout - TimeSpan.FromMinutes(1));
            Assert.Equal("ada", _sessions.Validate(token));
        }
    }

    [Fact]
    public void Invalidate_MakesATokenStopAuthenticating()
    {
        var token = _sessions.Issue("ada");

        _sessions.Invalidate(token);

        Assert.Null(_sessions.Validate(token));
    }
}
