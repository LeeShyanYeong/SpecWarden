namespace StickyNotes.Domain;

/// <summary>
/// Result of attempting to save a board: either it succeeded, or it was rejected
/// with the validation errors that blocked it.
/// </summary>
public sealed record SaveOutcome(bool Succeeded, IReadOnlyList<string> Errors)
{
    public static SaveOutcome Ok() => new(true, []);

    public static SaveOutcome Rejected(IReadOnlyList<string> errors) => new(false, errors);
}

/// <summary>
/// Application service for an owner's private board: read it, or save it after
/// validation. The save-or-reject decision lives here, not in the HTTP endpoint,
/// so a rejected save never touches the store (ARCH-4: logic in services). The
/// owner is resolved from the session by the endpoint; this service never serves
/// one owner another's board.
/// </summary>
public sealed class BoardService(IBoardStore store, BoardValidator validator)
{
    public Board GetBoard(string owner) => store.Load(owner);

    public SaveOutcome SaveBoard(string owner, Board board)
    {
        var errors = validator.Validate(board);
        if (errors.Count > 0)
        {
            return SaveOutcome.Rejected(errors);
        }

        store.Save(owner, board);
        return SaveOutcome.Ok();
    }
}
