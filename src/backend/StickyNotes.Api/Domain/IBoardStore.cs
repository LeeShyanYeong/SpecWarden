namespace StickyNotes.Domain;

/// <summary>
/// Stores the single shared board. There are no accounts yet, so there is exactly
/// one board; an owner can be added later without changing this contract.
/// </summary>
public interface IBoardStore
{
    /// <summary>Returns the last saved board, or <see cref="Board.Empty"/> if none.</summary>
    Board Load();

    /// <summary>Replaces the stored board with <paramref name="board"/> in full.</summary>
    void Save(Board board);
}
