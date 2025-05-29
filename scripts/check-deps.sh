echo "🔍 Checking outdated dependencies..."
pnpm outdated

echo ""
echo "🛡️ Security check..."
pnpm audit

echo ""
echo "📊 Dependency tree (top 10 levels)..."
pnpm list --depth=2

echo ""
echo "💡 To update all dependencies to latest versions:"
echo "pnpm update --latest"