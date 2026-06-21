using StickyNotes.Auth;

namespace StickyNotes.Tests.Auth;

/// <summary>A test clock whose "now" is set explicitly, for deterministic expiry tests.</summary>
internal sealed class MutableClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset UtcNow { get; set; } = now;

    public void Advance(TimeSpan by) => UtcNow += by;
}
