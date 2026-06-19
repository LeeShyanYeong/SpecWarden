using System.Text.RegularExpressions;

namespace Template.ArchitectureTests;

/// <summary>
/// Spec lifecycle guard — the executable form of the "stubs keep CI red" promise
/// in skills/brainstorm-task and skills/spec-task.
///
/// A brainstorm stub carries an @unspecified scenario and a "# Status: Stub"
/// header, but it has none of the level tags (@api/@e2e/@component) the
/// acceptance lanes route on — so neither Reqnroll nor Playwright would ever run
/// it, and a stub would otherwise pass silently. This fact makes any remaining
/// stub a build failure until spec-task fills it in (replacing @unspecified with
/// real scenarios and flipping the header to "# Status: Draft").
/// </summary>
public class SpecHygieneStandards
{
    // SPEC-1 — No spec is left as a stub.
    [Fact]
    public void Spec1_NoSpecIsAStub()
    {
        var specsDir = RepoRoot.Resolve("specs");
        if (!Directory.Exists(specsDir))
        {
            return; // No specs yet — nothing to guard.
        }

        var stubs = Directory
            .EnumerateFiles(specsDir, "*.feature", SearchOption.AllDirectories)
            .Where(IsStub)
            .Select(System.IO.Path.GetFileName)
            .ToList();

        Assert.True(
            stubs.Count == 0,
            "SPEC-1: these specs are still stubs (they contain @unspecified or a " +
            "'# Status: Stub' header). Run spec-task to fill in real scenarios before " +
            "merging:\n  " + string.Join("\n  ", stubs));
    }

    private static bool IsStub(string featurePath)
    {
        var text = File.ReadAllText(featurePath);
        return text.Contains("@unspecified", StringComparison.OrdinalIgnoreCase)
            || Regex.IsMatch(text, @"#\s*Status:\s*Stub", RegexOptions.IgnoreCase);
    }
}
