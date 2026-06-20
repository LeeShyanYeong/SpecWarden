using StickyNotes.Domain;

namespace StickyNotes.Tests;

public class BoardValidatorTests
{
    private readonly BoardValidator _validator = new();

    [Fact]
    public void NoteWithExactly500Characters_IsValid()
    {
        var board = new Board { Notes = [new Note { Text = new string('a', 500) }] };

        Assert.Empty(_validator.Validate(board));
    }

    [Fact]
    public void NoteWith501Characters_IsRejected()
    {
        var board = new Board { Notes = [new Note { Text = new string('a', 501) }] };

        Assert.NotEmpty(_validator.Validate(board));
    }

    [Fact]
    public void EmptyBoard_IsValid()
    {
        Assert.Empty(_validator.Validate(Board.Empty));
    }
}
