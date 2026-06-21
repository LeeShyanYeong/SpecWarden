namespace StickyNotes.Auth;

/// <summary>Abstracts "now" so session idle-expiry can be tested deterministically.</summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

/// <summary>The real wall clock.</summary>
public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
