namespace StickyNotes.Domain;

/// <summary>
/// A single sticky note: its text content and where it sits on the freeform
/// board. <see cref="Z"/> is the stacking order used to raise an active note
/// above overlapping ones.
/// </summary>
public record Note
{
    public string Id { get; init; } = string.Empty;
    public string Text { get; init; } = string.Empty;
    public double X { get; init; }
    public double Y { get; init; }
    public int Z { get; init; }
}
