export default async function handler(req, res) {
  try {
    const sources = [
      // 🔥 PRINCIPAIS (FIÁVEIS)
      "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", // WSJ
      "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", // NYT
      "https://www.economist.com/finance-and-economics/rss.xml",
      "https://feeds.feedburner.com/zerohedge/feed",
      "https://ark-invest.com/feed/",

      // 🔥 EXTRA (mercados)
      "https://feeds.a.dj.com/rss/RSSWorldNews.xml"
    ];

    let articles = [];

    // 🧠 1. RSS (base sólida)
    for (const url of sources) {
      try {
        const r = await fetch(url);
        const text = await r.text();

        const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];

        items.slice(0, 5).forEach(i => {
          const block = i[1];

          const title = block.match(/<title>(.*?)<\/title>/)?.[1] || "";
          const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
          const desc = block.match(/<description>(.*?)<\/description>/)?.[1] || "";

          articles.push({
            title: title.replace(/<!\[CDATA\[|\]\]>/g, ""),
            summary: desc.replace(/<[^>]+>/g, "").slice(0, 200),
            url: link
          });
        });

      } catch {}
    }

    // 🧠 2. IA PARA COMPLETAR (fontes difíceis)
    const aiExtra = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: `Dá-me 5 notícias recentes destas fontes:
- Morgan Stanley YouTube
- Guggenheim Investments
- BNP Paribas AM
- DWS
- IA (Yann LeCun, etc)

Formato:
[
 { "title":"", "summary":"", "url":"" }
]`
        }]
      })
    });

    const aiData = await aiExtra.json();
    const aiText = aiData.content?.[0]?.text || "";

    try {
      const extra = JSON.parse(aiText);
      articles = articles.concat(extra);
    } catch {}

    // 🔥 LIMITAR E LIMPAR
    const sample = articles.slice(0, 20);

    // 🧠 3. IA FINAL (organização estilo Bloomberg)
    const finalAI = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `Organiza estas notícias:

${JSON.stringify(sample)}

Formato:
{
 "hero": { "headline": "", "summary": "", "tags": [] },
 "cards": [
   { "headline": "", "summary": "", "source": "", "url": "", "tag": "" }
 ]
}

Ordena por impacto global.`
        }]
      })
    });

    const finalData = await finalAI.json();
    const text = finalData.content?.[0]?.text || "";

    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(200).json({ raw: text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}