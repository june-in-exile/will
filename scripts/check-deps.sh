echo "🔍 檢查過時依賴..."
pnpm outdated

echo ""
echo "🛡️ 安全檢查..."
pnpm audit

echo ""
echo "📊 依賴樹狀圖（前 10 層）..."
pnpm list --depth=2

echo ""
echo "💡 如果要更新所有依賴到最新版本："
echo "pnpm update --latest"
