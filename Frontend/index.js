console.log("index.js loaded");

// ================== NAV MENU ==================
const menuBtn = document.getElementById('menu-btn');
const navLinks = document.getElementById('nav-links');
const overlay = document.getElementById('overlay');
const closeBtn = document.getElementById('close-btn');

menuBtn.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  overlay.classList.toggle('active');
  menuBtn.classList.toggle('active');
});

overlay.addEventListener('click', () => {
  navLinks.classList.remove('active');
  overlay.classList.remove('active');
  menuBtn.classList.remove('active');
});

// ✅ Cross button closes the menu
closeBtn.addEventListener('click', () => {
  navLinks.classList.remove('active');
  overlay.classList.remove('active');
  menuBtn.classList.remove('active');
});


// ================== IMAGE CAROUSEL ==================
const carousel = document.querySelector('.carousel');
const images = carousel.querySelector('.carousel-images');
const dots = carousel.querySelectorAll('.dot');
const prevBtn = carousel.querySelector('.prev');
const nextBtn = carousel.querySelector('.next');

let index = 0; 
const total = dots.length;

// Update carousel
function updateCarousel() {
  images.style.transform = `translateX(-${index * 100}%)`;
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

// Next/Prev
function nextSlide() {
  index = (index + 1) % total;
  updateCarousel();
}

function prevSlide() {
  index = (index - 1 + total) % total;
  updateCarousel();
}

// Dot click
dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    index = i;
    updateCarousel();
  });
});

// Arrow click
nextBtn.addEventListener('click', nextSlide);
prevBtn.addEventListener('click', prevSlide);

// Auto slide
setInterval(nextSlide, 7000);

/*document.addEventListener("DOMContentLoaded", function () {

  const form = document.getElementById("contactForm");
  const responseBox = document.getElementById("responseMessage");

  if (!form) return; // safety check

  form.addEventListener("submit", function (e) {
    e.preventDefault(); // stop reload

    const formData = new FormData(form);

    fetch("home.php", {
      method: "POST",
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      responseBox.innerText = data.message;
      responseBox.style.marginTop = "15px";
      responseBox.style.fontWeight = "600";

      if (data.status === "success") {
        responseBox.style.color = "green";
        form.reset();
      } else {
        responseBox.style.color = "red";
      }
    })
    .catch(() => {
      responseBox.innerText = "Server error. Please try again.";
      responseBox.style.color = "red";
    });
  });

});*/
// ================== CONTACT FORM (AJAX) ==================
document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("#contactForm");
  const responseMessage = document.querySelector("#responseMessage");

  if (form && responseMessage) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault(); // prevent page reload

      const formData = new FormData(form);

      try {
        const response = await fetch("home.php", {
          method: "POST",
          body: formData,
        });

        const data = await response.text();

        // ✅ Show message from PHP
        responseMessage.innerHTML = data;

        // ✅ If success, clear form fields
        if (data.includes("successfully")) {
          form.reset();
        }
      } catch (error) {
        responseMessage.innerHTML =
          "<span style='color:red;'>Something went wrong. Please try again.</span>";
      }
    });
  }
});
