namespace StickyNotes.Domain;

/// <summary>Invariants a note must satisfy regardless of where it is enforced.</summary>
public static class NoteRules
{
    /// <summary>Maximum length of a note's text; input beyond this is rejected.</summary>
    public const int MaxTextLength = 500;
}

/// <summary>
/// Validates a board before it is persisted. Enforcing the 500-character cap here
/// (not only in the browser) means a direct API call cannot store an oversized note.
/// </summary>
public sealed class BoardValidator
{
    public IReadOnlyList<string> Validate(Board board)
    {
        var errors = new List<string>();

        for (var i = 0; i < board.Notes.Count; i++)
        {
            var note = board.Notes[i];
            if (note.Text.Length > NoteRules.MaxTextLength)
            {
                errors.Add(
                    $"Note at index {i} has {note.Text.Length} characters, " +
                    $"exceeding the {NoteRules.MaxTextLength}-character limit.");
            }
        }

        return errors;
    }
}
