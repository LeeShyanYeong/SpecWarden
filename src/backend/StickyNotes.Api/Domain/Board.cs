namespace StickyNotes.Domain;

/// <summary>
/// The whole sticky-note board: the complete set of notes. The board is saved
/// and loaded as one unit (a Save replaces it entirely).
/// </summary>
public record Board
{
    public IReadOnlyList<Note> Notes { get; init; } = [];

    /// <summary>A board with no notes — the initial and "cleared" state.</summary>
    public static Board Empty { get; } = new();
}
