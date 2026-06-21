using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace StickyNotes.Auth;

/// <summary>
/// In-memory session store. A token authenticates until it has been idle for
/// <see cref="IdleTimeout"/> (a sliding window reset on each use) or is explicitly
/// invalidated. Tokens are cryptographically random and opaque to the client.
/// </summary>
public sealed class SessionStore(IClock clock) : ISessionStore
{
    /// <summary>How long a session may sit idle before it expires (30 minutes).</summary>
    public static readonly TimeSpan IdleTimeout = TimeSpan.FromMinutes(30);

    private const int TokenBytes = 32;

    private readonly ConcurrentDictionary<string, Session> _sessions = new();

    public string Issue(string username)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(TokenBytes));
        _sessions[token] = new Session(username, clock.UtcNow);
        return token;
    }

    public string? Validate(string? token)
    {
        if (string.IsNullOrEmpty(token) || !_sessions.TryGetValue(token, out var session))
        {
            return null;
        }

        if (clock.UtcNow - session.LastSeenUtc > IdleTimeout)
        {
            Invalidate(token);
            return null;
        }

        session.LastSeenUtc = clock.UtcNow; // slide the idle window
        return session.Username;
    }

    public void Invalidate(string? token)
    {
        if (!string.IsNullOrEmpty(token))
        {
            _sessions.TryRemove(token, out _);
        }
    }

    private sealed class Session(string username, DateTimeOffset lastSeenUtc)
    {
        public string Username { get; } = username;
        public DateTimeOffset LastSeenUtc { get; set; } = lastSeenUtc;
    }
}
