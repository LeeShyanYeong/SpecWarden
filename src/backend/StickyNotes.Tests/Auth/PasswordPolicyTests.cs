using StickyNotes.Auth;

namespace StickyNotes.Tests.Auth;

public class PasswordPolicyTests
{
    [Fact]
    public void IsValid_AcceptsExactlyEightCharacters() =>
        Assert.True(PasswordPolicy.IsValid("12345678"));

    [Fact]
    public void IsValid_RejectsSevenCharacters() =>
        Assert.False(PasswordPolicy.IsValid("1234567"));

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void IsValid_RejectsEmptyOrNull(string? password) =>
        Assert.False(PasswordPolicy.IsValid(password));
}
