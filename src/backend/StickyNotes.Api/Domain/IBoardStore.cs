namespace StickyNotes.Domain;

/// <summary>
/// Stores one board per owner (keyed by the owner's normalized username). Each
/// signed-in user has exactly one private board; there is no shared board.
/// </summary>
public interface IBoardStore
{
    /// <summary>Returns the owner's last saved board, or <see cref="Board.Empty"/> if none.</summary>
    Board Load(string owner);

    /// <summary>Replaces the owner's stored board with <paramref name="board"/> in full.</summary>
    void Save(string owner, Board board);
}
