using StickyNotes.Auth;

namespace StickyNotes.Tests.Auth;

public class PasswordHasherTests
{
    private readonly PasswordHasher _hasher = new();

    [Fact]
    public void Hash_DoesNotContainThePlaintext()
    {
        var hash = _hasher.Hash("correct-horse");

        Assert.DoesNotContain("correct-horse", hash);
    }

    [Fact]
    public void Verify_ReturnsTrueForTheCorrectPassword()
    {
        var hash = _hasher.Hash("correct-horse");

        Assert.True(_hasher.Verify("correct-horse", hash));
    }

    [Fact]
    public void Verify_ReturnsFalseForAWrongPassword()
    {
        var hash = _hasher.Hash("correct-horse");

        Assert.False(_hasher.Verify("wrong-password", hash));
    }

    [Fact]
    public void Hash_IsSaltedSoEqualPasswordsHashDifferently()
    {
        Assert.NotEqual(_hasher.Hash("correct-horse"), _hasher.Hash("correct-horse"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-valid-hash")]
    [InlineData("only.one")]
    public void Verify_ReturnsFalseForAMalformedHash(string malformed) =>
        Assert.False(_hasher.Verify("correct-horse", malformed));
}
