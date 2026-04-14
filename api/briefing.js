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

    const sample = articles.slice(0, 15);

    // 🔥 FORÇAR JSON LIMPO (IMPORTANTE)
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        input: `Organiza estas notícias:

${JSON.stringify(sample)}

Formato:
{
 "hero": {
   "headline": "",
   "summary": "",
   "tags": ["financial","geo","markets","politics","tech"]
 },
 "cards": [
   {
     "headline": "",
     "summary": "",
     "source": "",
     "url": "",
     "tag": ""
   }
 ]
}`
      })
    });

    const data = await aiResponse.json();

    const text = data.output?.[0]?.content?.[0]?.text || "{}";

    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(200).json({ raw: text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}