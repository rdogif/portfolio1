const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const searchStatus = document.getElementById("search-status");
const opening = document.getElementById("opening-state");
const loading = document.getElementById("loading-state");
const notice = document.getElementById("notice-state");
const noticeTitle = document.getElementById("notice-title");
const noticeMessage = document.getElementById("notice-message");
const workbench = document.getElementById("workbench");
const resultList = document.getElementById("result-list");
const reader = document.getElementById("reader");
const recentSection = document.getElementById("recent-section");
const recentList = document.getElementById("recent-list");

let results = [];
let request;
let recent = readRecent();

function readRecent() {
    try {
        const saved = JSON.parse(localStorage.getItem("rdoogle-recent") || "[]");
        return Array.isArray(saved) ? saved.slice(0, 5) : [];
    } catch {
        localStorage.removeItem("rdoogle-recent");
        return [];
    }
}

function cleanText(value = "") {
    return value.replace(/\s+/g, " ").trim();
}

function showOnly(section) {
    [opening, loading, notice, workbench].forEach((item) => {
        item.hidden = item !== section;
    });
}

function renderRecent() {
    recentList.replaceChildren();
    recentSection.hidden = recent.length === 0;
    recent.forEach((term) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = term;
        button.addEventListener("click", () => chooseTerm(term));
        recentList.append(button);
    });
}

function remember(term) {
    recent = [
        term,
        ...recent.filter((item) => item.toLowerCase() !== term.toLowerCase()),
    ].slice(0, 5);
    localStorage.setItem("rdoogle-recent", JSON.stringify(recent));
    renderRecent();
}

function renderReader(page) {
    reader.replaceChildren();

    if (page.thumbnail?.source) {
        const image = document.createElement("img");
        image.src = page.thumbnail.source;
        image.alt = "";
        reader.append(image);
    }

    const copy = document.createElement("div");
    const title = document.createElement("h2");
    const extract = document.createElement("p");
    title.textContent = page.title;
    extract.className = "extract";
    extract.textContent = cleanText(page.extract) || "No introduction is available for this page.";
    copy.append(title, extract);

    if (page.fullurl) {
        const link = document.createElement("a");
        link.href = page.fullurl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "Read the full article ↗";
        copy.append(link);
    }

    reader.append(copy);

    [...resultList.children].forEach((button) => {
        const selected = Number(button.dataset.pageId) === page.pageid;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

function renderResults() {
    resultList.replaceChildren();
    results.forEach((page) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.pageId = page.pageid;
        button.textContent = page.title;
        button.addEventListener("click", () => renderReader(page));
        resultList.append(button);
    });
    renderReader(results[0]);
}

function showNotice(title, message) {
    noticeTitle.textContent = title;
    noticeMessage.textContent = message;
    showOnly(notice);
}

async function search(term) {
    const trimmed = term.trim();
    if (!trimmed) {
        searchStatus.textContent = "Type something to begin.";
        input.focus();
        return;
    }

    request?.abort();
    request = new AbortController();
    showOnly(loading);
    searchButton.disabled = true;
    searchButton.textContent = "Searching";
    searchStatus.textContent = `Searching for “${trimmed}”…`;

    const params = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: trimmed,
        gsrnamespace: "0",
        gsrlimit: "10",
        prop: "extracts|pageimages|info",
        exintro: "1",
        explaintext: "1",
        exsentences: "5",
        piprop: "thumbnail",
        pithumbsize: "640",
        inprop: "url",
        format: "json",
        formatversion: "2",
        origin: "*",
    });

    try {
        const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
            signal: request.signal,
        });
        if (!response.ok) throw new Error(String(response.status));

        const data = await response.json();
        results = (data.query?.pages || []).sort(
            (a, b) => (a.index || 0) - (b.index || 0),
        );

        if (!results.length) {
            searchStatus.textContent = `Nothing found for “${trimmed}”.`;
            showNotice("Nothing on that phrase.", "Try a broader phrase or check the spelling.");
            return;
        }

        renderResults();
        remember(trimmed);
        showOnly(workbench);
        searchStatus.textContent = `${results.length} articles found for “${trimmed}”.`;
    } catch (error) {
        if (error.name === "AbortError") return;
        searchStatus.textContent = "The search could not be reached.";
        showNotice("The desk is offline.", "Check your connection, then search again.");
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search";
    }
}

function chooseTerm(term) {
    input.value = term;
    search(term);
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    search(input.value);
});

document.querySelectorAll("[data-search]").forEach((button) => {
    button.addEventListener("click", () => chooseTerm(button.dataset.search));
});

document.getElementById("revise-search").addEventListener("click", () => input.focus());

document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.focus();
    }
});

renderRecent();
