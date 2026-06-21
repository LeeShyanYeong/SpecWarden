namespace StickyNotes.Auth;

/// <summary>Shared helpers for reading the bearer session credential off a request.</summary>
public static class HttpAuthExtensions
{
    /// <summary>The "Authorization: Bearer &lt;token&gt;" value, or null if absent/malformed.</summary>
    public static string? BearerToken(this HttpContext http)
    {
        const string prefix = "Bearer ";
        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? header[prefix.Length..].Trim()
            : null;
    }
}
