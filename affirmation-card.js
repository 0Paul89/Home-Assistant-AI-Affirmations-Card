class DailyAffirmationCard extends HTMLElement {
  constructor() {
    super();
    this.config = {};
    this.localAffirmations = [
      "Ich bin stark und voller Energie!",
      "Heute erreiche ich alle meine Ziele!",
      "Jede Herausforderung macht mich stärker!",
      "Ich verdiene Glück und Erfolg!",
      "Mein Selbstvertrauen wächst jeden Tag!"
    ];
  }

  setConfig(config) {
    this.config = config;
    // For non-Ollama APIs, an API key might be provided.
    this.apiKey = config.apiKey || null;
    this.apiType = config.apiType || "openai"; // Default: OpenAI
  }

  connectedCallback() {
    this.render();
    this.querySelector("button").addEventListener("click", () => this.refresh());
  }

  render() {
    // Use the API if either the apiType is "ollama" or an API key is provided.
    const shouldUseAPI = (this.apiType === "ollama" || this.apiKey);
    this.innerHTML = `
      <ha-card style="
        padding: 16px;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border-radius: 12px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        min-height: 200px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
      ">
        <h2 style="font-family: 'Arial', sans-serif; color: #2c3e50;">
          Tägliche Affirmation ✨
        </h2>
        <div id="content" style="
          font-size: 1.2em;
          margin: 1em 0;
          color: #34495e;
          min-height: 60px;
        ">
          ${this.getStoredAffirmation() || (shouldUseAPI ? "Generiere Affirmation..." : this.getRandomAffirmation())}
        </div>
        <button style="
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin: 0 auto;
        ">
          Neue Affirmation
        </button>
      </ha-card>
    `;

    // If no stored affirmation and an API call is expected, generate a new one.
    if (!this.getStoredAffirmation() && shouldUseAPI) {
      this.refresh();
    }
  }

  getRandomAffirmation() {
    return this.localAffirmations[Math.floor(Math.random() * this.localAffirmations.length)];
  }

  getStoredAffirmation() {
    return localStorage.getItem('dailyAffirmation');
  }

  async refresh() {
    const content = this.querySelector("#content");
    const shouldUseAPI = (this.apiType === "ollama" || this.apiKey);
    if (shouldUseAPI) {
      content.textContent = "Generiere Affirmation...";
      try {
        const affirmation = await this.generateAffirmation();
        // Store the new affirmation in localStorage
        localStorage.setItem('dailyAffirmation', affirmation);
        content.textContent = affirmation;
      } catch (error) {
        console.error("Error calling API:", error);
        content.textContent = "Fehler beim Generieren der Affirmation. Bitte versuche es erneut.";
      }
    } else {
      const randomAffirmation = this.getRandomAffirmation();
      localStorage.setItem('dailyAffirmation', randomAffirmation);
      content.textContent = randomAffirmation;
    }
  }

  async fetchGratitudeList() {
    try {
      const response = await fetch("/local/gratitude_list.txt");
      if (!response.ok) {
        throw new Error("Could not fetch gratitude list");
      }
      return await response.text();
    } catch (error) {
      console.error("Error fetching gratitude list:", error);
      return "";
    }
  }

  async generateAffirmation() {
    // Retrieve the user's gratitude list and include it in the prompt.
    const gratitudeList = await this.fetchGratitudeList();
    const prompt = `Erstelle eine einzigartige, inspirierende tägliche Affirmation auf Deutsch, die positive Energie ausstrahlt und motivierend wirkt. Deine Antwort soll NUR die Affirmation enthalten, keine Einleitung oder ähnliches. Hier sind einige persönliche Notizen:\n${gratitudeList}`;
    
    if (this.apiType === "deepseek") {
      return await this.fetchDeepSeek(prompt);
    } else if (this.apiType === "ollama") {
      return await this.fetchOllama(prompt);
    } else {
      return await this.fetchOpenAI(prompt);
    }
  }

  async fetchOpenAI(prompt) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error("OpenAI API request failed");
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async fetchDeepSeek(prompt) {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error("DeepSeek API request failed");
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async fetchOllama(prompt) {
    const response = await fetch("http://192.168.50.66:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "cas/discolm-mfto-german:latest",
        prompt: prompt,
        stream: false
      })
    });
    if (!response.ok) {
      throw new Error("Ollama API request failed");
    }
    const data = await response.json();
    return data.response.trim();
  }
}

customElements.define("daily-affirmation-card", DailyAffirmationCard);
