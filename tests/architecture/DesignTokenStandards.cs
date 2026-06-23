using System.Text.RegularExpressions;

namespace Template.ArchitectureTests;

/// <summary>
/// ARCH-5 — Frontend stylesheets consume design tokens, not raw literals.
///
/// Codifies ADR-003 (CSS custom properties as the design-token mechanism): visual
/// values live once as custom properties on :root in src/frontend/src/styles.css and
/// are referenced with var(--token); component stylesheets must not hardcode a hex
/// colour or a px length. The token file (styles.css) is the single place literals may
/// appear. Hairline 1px borders are the one pragmatic exception ADR-003 floated.
///
/// Dormant until src/frontend exists, then a build-breaking guard — same posture as
/// ARCH-1/2/3. (Known edge: an ID selector whose name is all hex letters, e.g. #fade,
/// would read as a colour; rare in component CSS — revisit if it ever bites.)
/// </summary>
public class DesignTokenStandards
{
    // The single file allowed to hold raw literals — the token source of truth (ADR-003).
    private const string TokenFileName = "styles.css";

    // Raw hex colour: # followed by 3/4/6/8 hex digits (e.g. #fff8b0, #ddd).
    private static readonly Regex HexColour = new(
        @"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b",
        RegexOptions.Compiled);

    // Raw px length, e.g. 48px, 0.5px, 160px.
    private static readonly Regex PxLength = new(
        @"\b\d+(?:\.\d+)?px\b",
        RegexOptions.Compiled);

    [Fact]
    public void Arch5_FrontendStylesheetsUseTokensNotRawLiterals()
    {
        var frontendSrc = RepoRoot.Resolve("src", "frontend", "src");
        if (!Directory.Exists(frontendSrc))
        {
            return; // No frontend source yet — rule is vacuously satisfied (activates once it exists).
        }

        var offenders = new List<string>();

        foreach (var css in Directory.EnumerateFiles(frontendSrc, "*.css", SearchOption.AllDirectories))
        {
            if (string.Equals(Path.GetFileName(css), TokenFileName, StringComparison.OrdinalIgnoreCase))
            {
                continue; // styles.css is the token source — literals are allowed here (ADR-003).
            }

            var relative = Path.GetRelativePath(RepoRoot.Path, css);
            var lines = File.ReadAllLines(css);

            for (var i = 0; i < lines.Length; i++)
            {
                foreach (Match m in HexColour.Matches(lines[i]))
                {
                    offenders.Add($"{relative}:{i + 1}  raw hex colour '{m.Value}'");
                }

                foreach (Match m in PxLength.Matches(lines[i]))
                {
                    if (m.Value == "1px")
                    {
                        continue; // hairline border exception (ADR-003)
                    }

                    offenders.Add($"{relative}:{i + 1}  raw px length '{m.Value}'");
                }
            }
        }

        Assert.True(
            offenders.Count == 0,
            "ARCH-5: frontend stylesheets must use design tokens (var(--token)), not raw literals. " +
            $"Define these on :root in src/frontend/src/{TokenFileName} and reference them (see ADR-003):\n  " +
            string.Join("\n  ", offenders));
    }
}
