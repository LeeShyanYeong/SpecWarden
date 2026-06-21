namespace StickyNotes.Auth;

/// <summary>
/// Issues, validates, and invalidates opaque session tokens. A token authenticates
/// until it has been idle past the timeout (sliding window) or is signed out.
/// </summary>
public interface ISessionStore
{
    /// <summary>Issues a new opaque session token for the given normalized username.</summary>
    string Issue(string username);

    /// <summary>
    /// Returns the username for a live token and slides its idle window, or null if
    /// the token is unknown or has been idle past the timeout.
    /// </summary>
    string? Validate(string? token);

    /// <summary>Invalidates a token so it can no longer authenticate (sign-out).</summary>
    void Invalidate(string? token);
}
