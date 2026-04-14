export default async function handler(req, res) {
  try {
    const sources = [
      "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
      "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
      "https://www.economist.com/finance-and-economics/rss.xml",
      "https://feeds.feedburner.com/zerohedge/feed",
      "https://ark-invest.com/feed/"
    ];

    let articles = [];

    // 🔹 RSS (garantido)
    for (const url of sources) {
      try {
        const r = await fetch(url);
        const text = await r.text();

        const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];

        items.slice(0, 4).forEach(i => {
          const block = i[1];

          const title = block.match(/<title>(.*?)<\/title>/)?.[1] || "";
          const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
          const desc = block.match(/<description>(.*?)<\/description>/)?.[1] || "";

          articles.push({
            headline: title.replace(/<!\[CDATA\[|\]\]>/g, ""),
            summary: desc.replace(/<[^>]+>/g, "").slice(0, 140),
            url: link,
            source: "News",
            tag: "markets"
          });
        });

      } catch {}
    }

    // 🔥 FALLBACK (SEM IA — nunca falha)
    if (articles.length === 0) {
      return res.status(200).json({
        raw: JSON.stringify({
          hero: {
            headline: "Mercados globais em destaque",
            summary: "Não foi possível carregar fontes externas, mas o sistema está ativo.",
            tags: ["markets"]
          },
          cards: []
        })
      });
    }

    // 🔥 HERO simples (sem IA para estabilidade)
    const result = {
      hero: {
        headline: articles[0].headline,
        summary: articles[0].summary,
        tags: ["markets"]
      },
      cards: articles.slice(1, 10)
    };

    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(200).json({ raw: JSON.stringify(result) });

  } catch (err) {
    res.status(500).json({
      raw: JSON.stringify({
        hero: {
          headline: "Erro ao carregar briefing",
          summary: err.message,
          tags: ["markets"]
        },
        cards: []
      })
    });
  }
}