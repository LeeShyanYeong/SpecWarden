using System.Collections.Concurrent;

namespace StickyNotes.Auth;

/// <summary>
/// In-memory account store for the life of the server (a restart clears it;
/// durable storage is a later story). Keyed by normalized username, so uniqueness
/// is case-insensitive. Callers store already-normalized usernames.
/// </summary>
public sealed class InMemoryUserStore : IUserStore
{
    private readonly ConcurrentDictionary<string, User> _users = new();

    public bool TryAdd(User user) => _users.TryAdd(user.Username, user);

    public User? Find(string normalizedUsername) =>
        _users.TryGetValue(normalizedUsername, out var user) ? user : null;
}
