namespace StickyNotes.Auth;

/// <summary>
/// Stores accounts keyed by their normalized username. Adding is the point where
/// case-insensitive uniqueness is enforced.
/// </summary>
public interface IUserStore
{
    /// <summary>Adds the account; returns false if the username already exists.</summary>
    bool TryAdd(User user);

    /// <summary>Finds an account by normalized username, or null if none exists.</summary>
    User? Find(string normalizedUsername);
}
