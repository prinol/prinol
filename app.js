const works = [
  {
    title: "Midnight Surface",
    year: 2026,
    category: "회화",
    description: "짙은 색면과 얇은 결을 겹쳐 만든 연작의 일부입니다.",
    tags: ["캔버스", "추상"],
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Soft Structure",
    year: 2025,
    category: "드로잉",
    description: "선과 여백의 균형을 중심으로 한 흑연 드로잉 작업입니다.",
    tags: ["드로잉", "모노톤"],
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Fragmented Garden",
    year: 2026,
    category: "콜라주",
    description: "자연 이미지와 인공적 패턴을 겹쳐 장면을 재구성했습니다.",
    tags: ["콜라주", "시리즈"],
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Quiet Figure",
    year: 2024,
    category: "사진",
    description: "빛의 방향과 정지된 자세에 집중한 인물 중심 작업입니다.",
    tags: ["사진", "인물"],
    image: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Paper Memory",
    year: 2025,
    category: "오브제",
    description: "종이 질감과 절단면을 활용해 기억의 층위를 표현했습니다.",
    tags: ["오브제", "재료실험"],
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Blue Interval",
    year: 2026,
    category: "회화",
    description: "푸른 계열의 밀도 차이를 이용해 리듬을 만든 화면입니다.",
    tags: ["캔버스", "색면"],
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
  }
];

const galleryEl = document.getElementById("gallery");
const filterRowEl = document.getElementById("filterRow");

const categories = ["전체", ...new Set(works.map(work => work.category))];
let activeCategory = "전체";

function renderFilters() {
  filterRowEl.innerHTML = "";
  categories.forEach(category => {
    const button = document.createElement("button");
    button.className = `filter-btn ${category === activeCategory ? "active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      renderGallery();
    });
    filterRowEl.appendChild(button);
  });
}

function renderGallery() {
  const filtered = activeCategory === "전체"
    ? works
    : works.filter(work => work.category === activeCategory);

  galleryEl.innerHTML = filtered.map(work => `
    <article class="card">
      <div class="card-media">
        <img src="${work.image}" alt="${work.title}" loading="lazy" />
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-title">${work.title}</h3>
          <span class="card-year">${work.year}</span>
        </div>
        <p class="card-desc">${work.description}</p>
        <div class="card-tags">
          <span class="tag">${work.category}</span>
          ${work.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
        </div>
      </div>
    </article>
  `).join("");
}

renderFilters();
renderGallery();
