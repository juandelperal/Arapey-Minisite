import "./assets.js";
import { fontName } from "./font";
import FontFaceObserver from "fontfaceobserver";

const fontTimeOut = 5000; // In milliseconds

// Generic: throttle
const throttle = (fn, wait) => {
	let last, queue;

	return function runFn(...args) {
		const now = Date.now();
		queue = clearTimeout(queue);

		if (!last || now - last >= wait) {
			fn.apply(null, args);
			last = now;
		} else {
			queue = setTimeout(runFn.bind(null, ...args), wait - (now - last));
		}
	};
};

// Generic: Like setInterval, but with rAF for better performance
function setRAFInterval(fn, delay) {
	let start = Date.now();
	const data = {};
	data.id = requestAnimationFrame(loop);

	return data;

	function loop() {
		data.id = requestAnimationFrame(loop);

		if (Date.now() - start >= delay) {
			fn();
			start = Date.now();
		}
	}
}

// Generic: detect passive
let supportsPassive = false;
try {
	const opts = Object.defineProperty({}, "passive", {
		get: function() {
			supportsPassive = true;
			return true; // Abide getter-return linter check
		}
	});
	window.addEventListener("testPassive", null, opts);
	window.removeEventListener("testPassive", null, opts);
} catch (e) {
	// Do nothing
}

// Set up FontFaceObserver
const font = new FontFaceObserver(fontName);
font.load(null, fontTimeOut).then(
	() => {
		// Font has loaded
		setTimeout(() => {
			document.documentElement.classList.add("fonts-loaded");
			setViewportValues();
			initializeApp();
			aboutFonts.init();
			getWeather();
			characterSlide.init();
			sliderEnhancements();
		}, 1);
	},
	() => {
		// Font didn't load
		document.documentElement.classList.add("fonts-failed");
	}
);

const setupInputs = () => {
	// Interactive controls (sliders that tweak axes)
	const interactives = document.querySelectorAll(".interactive-controls");
	for (const interactive of interactives) {
		const area = interactive.querySelector(".interactive-controls-text");
		const sliders = interactive.querySelectorAll(
			".interactive-controls-slider"
		);

		const instances = interactive.querySelector(
			".interactive-controls-instances"
		);

		const varset = (name, value) => {
			area.style.setProperty(`--${name}`, value);
		};

		for (const slider of sliders) {
			// Apply initial axis value to text area

			varset(slider.name, slider.value);
			setupBadge(slider, slider.value);

			if (slider.name == "wght-slider")
				aboutFonts.syncCodeBlock(slider.name, slider.value);

			slider.oninput = e => {
				// Set new axis value to text area
				varset(e.target.name, e.target.value);
				// Unselect named instance dropdown
				// Optionally, see if current axes match instance and select that
				if (instances) {
					instances.selectedIndex = -1;
				}

				setupBadge(slider, e.target.value);

				if (slider.name == "wght-slider")
					aboutFonts.syncCodeBlock(slider.name, e.target.value);
			};
		}

		if (instances) {
			instances.onchange = e => {
				const axes = JSON.parse(
					e.target.options[e.target.selectedIndex].value
				);

				for (const axis in axes) {
					// Set new axis value on slider
					interactive.querySelector(`[name=${axis}]`).value =
						axes[axis];
					// Apply new axis value to text area
					varset(axis, axes[axis]);
				}
			};
		}
	}
};

// Watch if .am-i-in-view elements are visible on screen
// and apply a class accordingly
if ("IntersectionObserver" in window) {
	// eslint-disable-next-line compat/compat
	const obs = new IntersectionObserver(els => {
		els.forEach(el => {
			el.isIntersecting
				? el.target.classList.add("in-view")
				: el.target.classList.remove("in-view");
		});
	});

	const elements = document.querySelectorAll(".am-i-in-view");

	elements.forEach(el => {
		obs.observe(el);
	});
}

// Character grid
const gridSection = document.querySelector(".character-grid-section");
const grid = gridSection.querySelector(".character-grid");
const gridzoom = gridSection.querySelector(".character-grid-zoom");
let previousCharacterGrid = null;
const setGridCharacter = e => {
	if (!e) {
		// Init on first view
		gridzoom.textContent = "A";
		grid.querySelector("[data-character=A]").classList.add("active");
	} else if (e.target.tagName === "LI") {
		if (e.target.textContent !== previousCharacterGrid) {
			grid.querySelector(".active").classList.remove("active");
			e.target.classList.add("active");
			gridzoom.textContent = previousCharacterGrid = e.target.textContent;
		}
	}
};

grid.onmousemove = throttle(setGridCharacter, 100);

// Sliders
// TODO: maybe we can cache the value of slide.offsetWidth and
// badge.offsetWidth, as they won't change unless the viewport
// size changes (in which we can recalculate them, see comment
// around initializeApp)
const thumbWidth = 16;
const setupBadge = (slider, value) => {
	const sliderContainer = slider.closest(`.${slider.name}-container`);
	const badge = sliderContainer.querySelector(".interactive-controls-badge");
	const badgeOffset =
		(slider.dataset.width - thumbWidth) /
		(parseFloat(slider.max) - parseFloat(slider.min));

	if (!badge) return;

	const badgePosition =
		(parseFloat(value) - parseFloat(slider.min)) * badgeOffset -
		badgeWidth / 2 +
		thumbWidth / 2;

	badge.textContent = Math.round(value);
	badge.style.setProperty("--badge-position-x", `${badgePosition}px`);
	badge.style.setProperty("--weight", `${value}`);
};

const toggleBlockContainer = document.querySelector(".toggle-block-container");
const toggles = toggleBlockContainer.querySelectorAll(
	".interactive-controls-checkbox"
);

const handleToggle = e => {
	const value = e.target.checked ? 900 : 100;
	e.target
		.closest(".toggle-block")
		.style.setProperty("--toggle-block-font-weight", value);
};

toggles.forEach(toggle => toggle.addEventListener("change", handleToggle));

// Handle select box
const selectElements = {
	handle: document.querySelectorAll("#interactive-controls-select"),
	dropdown: document.querySelectorAll(".interactive-controls-options-list")
};

selectElements.handle.forEach(handle => {
	handle.addEventListener("click", e => {
		e.stopPropagation();
		e.currentTarget.nextElementSibling.classList.add("show");
	});
});

selectElements.dropdown.forEach(dropdown => {
	dropdown.addEventListener("click", e => {
		const interactiveElement = dropdown.closest(".interactive-controls");
		const opszSlider = interactiveElement.querySelector(".opsz");
		if (e.target.type == "button") {
			const textContainer = e.currentTarget.previousElementSibling.querySelector(
				"span"
			);
			e.currentTarget.previousElementSibling.setAttribute(
				"value",
				e.target.value
			);

			e.currentTarget.querySelector(".active").classList.remove("active");

			e.target.classList.add("active");

			textContainer.textContent = e.target.value;
			e.currentTarget.classList.remove("show");

			interactiveElement.style.setProperty(
				"--wght",
				e.target.getAttribute("data-wght")
			);

			interactiveElement.style.setProperty(
				"--opsz",
				e.target.getAttribute("data-opsz")
			);

			if (opszSlider) {
				opszSlider.value = e.target.getAttribute("data-opsz");

				setupBadge(
					interactiveElement.querySelector(".opsz"),
					e.target.getAttribute("data-opsz")
				);
			}
		}
	});
});

const onClickOutside = () => {
	selectElements.dropdown.forEach(dropdown => {
		if (dropdown.classList.contains("show")) {
			dropdown.classList.remove("show");
		}
	});
};

window.addEventListener("click", onClickOutside);

const characterSlideSection = document.querySelector(
	".character-slide-section"
);
const characterSlideListContainer = characterSlideSection.querySelector(
	".character-slide-lists"
);

// Sliding wall of characters
// TODO: avoid layout thrashing by caching offset values,
//       especially in the loop
const characterSlide = {
	x: 0,
	oldX: 0,
	isDown: false,
	shouldSlide: true,
	scrollLeft: 0,
	momentumID: null,
	slideSpeed: -1,
	dir: "right",
	init: function() {
		this.addListeners();
	},
	addListeners: function() {
		characterSlideListContainer.addEventListener(
			"mouseover",
			() => (characterSlide.shouldSlide = false)
		);
		characterSlideListContainer.addEventListener("mouseout", () => {
			characterSlide.shouldSlide = true;
			characterSlide.slideSpeed = characterSlide.lastSlideSpeed;
		});
		characterSlideListContainer.addEventListener(
			"mouseover",
			() => (characterSlide.shouldSlide = false)
		);
		characterSlideListContainer.addEventListener(
			"mouseup",
			this.stopCharacterSlider
		);
		characterSlideListContainer.addEventListener(
			"mouseleave",
			this.stopCharacterSlider
		);
		characterSlideListContainer.addEventListener(
			"mousedown",
			this.onPressCharacterSlide
		);
		characterSlideListContainer.addEventListener(
			"touchstart",
			this.onPressCharacterSlide,
			supportsPassive ? { passive: true } : false
		);
		characterSlideListContainer.addEventListener(
			"touchmove",
			this.onMoveCharacterSlide,
			supportsPassive ? { passive: true } : false
		);
		characterSlideListContainer.addEventListener(
			"mousemove",
			this.onMoveCharacterSlide
		);

		characterSlideListContainer.addEventListener("touchend", () => {
			characterSlide.shouldSlide = true;
			characterSlide.slideSpeed = characterSlide.lastSlideSpeed;
		});
	},
	onPressCharacterSlide: function(e) {
		characterSlide.isDown = true;
		characterSlide.shouldSlide = false;

		characterSlide.oldX = e.pageX;
		characterSlide.x = e.pageX - e.currentTarget.offsetLeft;
		characterSlide.scrollLeft = e.currentTarget.scrollLeft; // keep pos of scrolling in the scroll container
		characterSlideListContainer.classList.add("active");
	},
	onMoveCharacterSlide: function(e) {
		if (!characterSlide.isDown) return;

		const slideDistance = e.pageX - characterSlide.x;
		characterSlide.slideSpeed = e.pageX - characterSlide.oldX;
		characterSlide.oldX = e.pageX;
		e.currentTarget.scrollLeft = characterSlide.scrollLeft - slideDistance;
	},
	stopCharacterSlider: function() {
		characterSlide.isDown = false;

		characterSlideListContainer.classList.remove("active");
		cancelAnimationFrame(characterSlide.momentumID);
		characterSlide.loop();
	},
	loop: function() {
		const factor = 0.9;
		if (this.slideSpeed > 1.5 || this.slideSpeed < -1.5) {
			// Finish momentum slide
			this.slideSpeed *= factor;
			this.lastSlideSpeed = this.slideSpeed;
		} else {
			// Done slowing down, round last speed to a sane minimum
			if (this.shouldSlide) {
				this.slideSpeed = this.slideSpeed >= 0 ? 1 : -1;
			} else {
				this.slideSpeed = 0;
			}
		}

		// If edge is reached, reverse scroll direction
		if (
			characterSlideListContainer.scrollWidth -
				characterSlideSection.scrollWidth ===
				characterSlideListContainer.scrollLeft ||
			characterSlideListContainer.scrollLeft === 0
		) {
			this.slideSpeed = this.slideSpeed * -1;
			this.lastSlideSpeed = this.slideSpeed;
		}

		characterSlideListContainer.scrollLeft -= this.slideSpeed;
		this.momentumID = requestAnimationFrame(() => characterSlide.loop());
	}
};

const capsSelectionList = characterSlideSection.querySelector(
	".slider-selector"
);
const onSwitchCase = e => {
	if (e.target.tagName !== "BUTTON") return;
	capsSelectionList.querySelector(".active").classList.remove("active");
	characterSlideListContainer
		.querySelector(".active")
		.classList.remove("active");

	e.target.classList.add("active");
	characterSlideListContainer
		.querySelector(`[data-value=${e.target.value}]`)
		.classList.add("active");
};
capsSelectionList.addEventListener("click", onSwitchCase);

// Letterwave
const letterWave = {
	// Setup stuff:
	letter: "A",
	color: "eeeeee",
	cellSize: 30, // Smaller = more letters
	steps: 16, // How many frames in animation from lowest to highest weight
	waveStep: 3, // Speed to step through weightMap
	waveAngle: 0.5, // Use this to determine steepness/angle
	lineOffsetLines: 3, // How many "jagged starts"
	darkenFactor: 2, // How much to darken bolder weight
	cursorSize: 1,
	// Internal stuff:
	mapType: "",
	letters: [],
	waveOffset: 0,
	canvas: null,
	ctx: null,
	width: 0,
	height: 0,
	weightMap: [],
	letterCanvases: [],
	row: 0,
	columns: 0,
	setup(selector, mapType) {
		this.canvas = document.querySelector(selector);
		this.mapType = mapType;
		this.setupCanvas();
		this.setupLetterPositions();
		this.setupWeightMap();
		this.preRenderChars();
	},
	setLetter(letter, color) {
		this.letter = letter ? letter : this.letter;
		this.color = color ? color : this.color;
		this.preRenderChars();
	},
	resizeCanvas() {
		this.setupCanvas();
		this.setupLetterPositions();
	},
	// Pre-render chars
	// We need to do this as rendering (variable) fonts directly
	// to canvas each frame is too slow. We now build a cache of
	// canvassed of the letter at each desired weight, and render
	// those to the main canvas.
	preRenderChars() {
		const weighStep = Math.round(800 / this.steps); // Weight 100 to 900 = 800 steps
		let weight = 100; // Weight starts at this value
		let hexColor = parseInt(this.color, 16);

		// Generate pre-rendered letters for weights 100 to 900
		this.letterCanvases = [];
		for (let i = 0; i <= this.steps; i++) {
			const letterCanvas = document.createElement("canvas");
			const letterCtx = letterCanvas.getContext("2d");
			letterCtx.canvas.width = this.cellSize;
			letterCtx.canvas.height = this.cellSize;
			letterCtx.fillStyle = `#${hexColor.toString(16)}`;

			letterCtx.font = `${weight} ${this.cellSize}px Arapey`;
			letterCtx.textAlign = "center";
			letterCtx.textBaseline = "middle";
			letterCtx.fillText(
				this.letter,
				this.cellSize / 2,
				this.cellSize / 2
			);
			this.letterCanvases.push(letterCanvas);

			weight += weighStep;

			// 65793 = 0x0101010, so turns #CCCCCC into #CBCBCB etc.
			hexColor -= this.darkenFactor * 65793;
		}
	},
	setupCanvas() {
		this.width = this.canvas.offsetWidth;
		this.height = this.canvas.offsetHeight;
		this.ctx = this.canvas.getContext("2d");
		this.ctx.canvas.width = this.width;
		this.ctx.canvas.height = this.height;
	},
	// Array of each letter's position
	setupLetterPositions() {
		this.columns = Math.floor(this.width / this.cellSize);
		this.rows = Math.floor(this.height / this.cellSize);

		this.letters = [];
		for (let i = 0; i <= this.rows; i++) {
			for (let j = 0; j <= this.columns; j++) {
				this.letters.push({
					x: j * this.cellSize,
					y: i * this.cellSize
				});
			}
		}
	},
	// Array weights to loop through
	setupWeightMap() {
		this.weightMap = [];
		for (let i = 0; i <= this.steps; i++) {
			if (this.mapType === "flat") {
				this.weightMap.push(0);
			} else {
				this.weightMap.push(i);
				this.weightMap.unshift(i);
				this.weightMap.unshift(i);
				this.weightMap.unshift(i);
			}
		}
	},
	// Draw a new iteration of the wave to canvas
	renderWave() {
		let lineStartOffset = 0;
		let count = this.waveOffset;
		let localCount = this.waveOffset;
		let previousLetterY;
		let offsetX;

		// Clear canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw each letter
		for (const letter of this.letters) {
			if (previousLetterY !== letter.y) {
				// New row, shift starting weight
				localCount += this.waveAngle;
				count = Math.round(localCount);
				lineStartOffset++;
				lineStartOffset %= this.lineOffsetLines;
				offsetX =
					(lineStartOffset / this.lineOffsetLines) * this.cellSize;
			}

			// Determine weight based on cursor distance
			let spotLightWeight = 0;
			let waveWeight = 0;
			if (this.mapType === "flat") {
				const topOffset = this.canvas.getBoundingClientRect().top; // TODO: perf heavy!
				const spotLightRatio = this.columns / this.rows;
				const weightX = Math.abs((letter.x - mouse.x) / this.columns);
				const weightY = Math.abs(
					(letter.y - mouse.y + topOffset) / this.rows
				);
				spotLightWeight = Math.round(
					Math.hypot(weightX * spotLightRatio, weightY) *
						this.cursorSize
				);
				spotLightWeight =
					this.steps -
					Math.min(Math.max(spotLightWeight, 0), this.steps);
			} else {
				// Determine weight based on wave
				waveWeight = this.weightMap[count++ % this.weightMap.length];
			}

			const weight = Math.max(waveWeight, spotLightWeight);

			this.ctx.drawImage(
				this.letterCanvases[weight],
				Math.round(letter.x - offsetX),
				letter.y
			);
			previousLetterY = letter.y;
		}
		this.waveOffset += this.waveStep;
	}
};

// On hover, put new letter in top letterwave
document.querySelector(".arapey-hero-title").addEventListener(
	"mouseover",
	throttle(e => {
		if (e.target.tagName === "SPAN") {
			const newLetter = e.target.textContent;
			topWave.setLetter(newLetter.toUpperCase());
		}
	}, 100)
);

const topWave = Object.create(letterWave);
const bottomWave = Object.create(letterWave);
const initializeApp = () => {
	setupInputs();
	setGridCharacter();

	selectElements.dropdown.forEach(dropdown =>
		dropdown.querySelector("[value='Regular']").classList.add("active")
	);

	// Animate top letterwave ("AAAAAA")
	topWave.setup(".arapey-hero-canvas");
	bottomWave.setup(".arapey-zzzz-canvas", "flat");
	bottomWave.setLetter("Z");
	setRAFInterval(() => {
		topWave.renderWave();
		bottomWave.renderWave();
	}, 100);

	// Slide wall of characters
	characterSlide.loop();
};

// General mouse object.
const mouse = {
	x: 0,
	y: 0,
	dragCallback: false, // What to do when a dragged element is moved
	endCallback: false, // What to do when a dragging stops
	executeCallback: function(e) {
		if (mouse.dragCallback) {
			if (e.cancelable) {
				e.preventDefault();
			}
			mouse.dragCallback(e);
		}
	}
};
window.addEventListener("mousemove", e => {
	mouse.x = e.clientX;
	mouse.y = e.clientY;
	mouse.executeCallback(e);
});
window.addEventListener("touchstart", e => {
	mouse.x = e.changedTouches[0].clientX;
	mouse.y = e.changedTouches[0].clientY;
	mouse.executeCallback(e);
});
window.addEventListener("mouseup", () => {
	mouse.endCallback && mouse.endCallback();
	mouse.dragCallback = mouse.endCallback = false;
});

window.addEventListener("touchmove", e => {
	mouse.x = e.changedTouches[0].clientX;
	mouse.y = e.changedTouches[0].clientY;
});

const aboutFontsSection = document.querySelector(
	".about-variable-fonts-section"
);

const aboutFonts = {
	init() {
		this.parentContainerEl.addEventListener("mousedown", this.onMouseDown);
		this.parentContainerEl.addEventListener(
			"touchstart",
			this.onMouseDown,
			supportsPassive ? { passive: true } : false
		);
		this.parentContainerEl.addEventListener(
			"mousemove",
			this.onDragCharacter
		);
		this.parentContainerEl.addEventListener(
			"touchmove",
			this.onDragCharacter,
			supportsPassive ? { passive: true } : false
		);
		this.parentContainerEl.addEventListener(
			"mouseup",
			this.onDropCharacter
		);
		this.parentContainerEl.addEventListener(
			"touchend",
			this.onDropCharacter
		);
		this.parentContainerEl.addEventListener(
			"mouseleave",
			this.onDropCharacter
		);
		this.weightSlider.addEventListener("input", this.onDragInput);
		this.weightSlider.addEventListener(
			"touchstart",
			this.onDragInput,
			supportsPassive ? { passive: true } : false
		);
		this.weightSlider.addEventListener(
			"touchmove",
			this.onDragInput,
			supportsPassive ? { passive: true } : false
		);
	},
	parentContainerEl: aboutFontsSection.querySelector(
		".character-slider-container"
	),
	containerEl: aboutFontsSection.querySelector(".character-slider"),
	characterEl: aboutFontsSection.querySelector(".character"),
	weightSlider: aboutFontsSection.querySelector(".wght-slider"),
	isDown: false,
	maxFontWeight: 900,
	onDragCharacter: e => {
		if (!aboutFonts.isDown) return;
		e.preventDefault();

		aboutFonts.calculateCharacterPos();
	},
	onDragInput: () => {
		aboutFonts.calculateCharacterPos();
	},
	onDropCharacter: () => {
		aboutFonts.isDown = false;
	},
	onMouseDown: () => {
		aboutFonts.isDown = true;
	},
	syncCodeBlock(name, value) {
		const sliderValue = Math.round(value);

		aboutFontsSection
			.querySelector("code")
			.querySelector(`.${name}`).textContent = sliderValue;
	},
	calculateCharacterPos() {
		const distX = mouse.x - this.containerEl.offsetLeft;
		const percentageWidth = (
			distX /
			(this.containerEl.offsetWidth / 100)
		).toFixed(2);
		const posX = Math.max(0, Math.min(percentageWidth, 100));
		let weight = 100 + percentageWidth * 8;
		weight = Math.max(100, Math.min(weight, 900));

		this.weightSlider.value = weight;
		this.characterEl.style.setProperty("--character-pos-x", `${posX}%`);
		this.characterEl.style.setProperty("--wght-slider", `${weight}`);
		this.syncCodeBlock(this.weightSlider.name, weight);

		setupBadge(this.weightSlider, weight);
	}
};

const fontsInUse = {
	element: document.querySelector(".fonts-in-use"),
	scrollPos: 0,
	start: null,
	end: null,
	perc: null
};

window.onscroll = throttle(() => {
	fontsInUse.scrollPos = window.scrollY;

	if (
		fontsInUse.scrollPos > fontsInUse.start &&
		fontsInUse.scrollPos < fontsInUse.uvEnd
	) {
		const offset =
			10 *
			(
				(fontsInUse.scrollPos - fontsInUse.start) /
				fontsInUse.perc
			).toFixed(4);
		fontsInUse.element.style.setProperty("--offset", offset);
	}
}, 100);

// Update variables related to the viewport
let badgeWidth = 0;
const sliders = document.querySelectorAll(".interactive-controls-slider");
const setViewportValues = () => {
	fontsInUse.start = fontsInUse.element.offsetTop - window.innerHeight;
	fontsInUse.uvEnd =
		fontsInUse.element.offsetTop + fontsInUse.element.offsetHeight;
	fontsInUse.perc = fontsInUse.uvEnd - fontsInUse.start;

	// Determine opsz container width
	const opszWidth = document.querySelector(".opsz-demo-control").offsetWidth;
	document
		.querySelector(".opsz-demo")
		.style.setProperty("--width", `${opszWidth}px`);

	sliders.forEach(slider => {
		slider.dataset.width = slider.offsetWidth;
	});

	// All badges are equal width, so just query the first one
	badgeWidth = document.querySelector(".interactive-controls-badge")
		.offsetWidth;
};

const designFeatures = {
	container: document.querySelector(".floating-letter-container"),
	setActiveLetter(e) {
		const letter = e.target.closest(".floating-letter");
		if (letter) {
			designFeatures.container
				.querySelector(".active")
				.classList.remove("active");
			letter.classList.add("active");
		}
	}
};

designFeatures.container.addEventListener(
	"click",
	designFeatures.setActiveLetter
);

// Swiper for opsz demo
const swiperContainer = document.querySelector(".opsz-demo-container");
const swiper = document.querySelector(".opsz-demo");
const calculateSwiperOffset = () => {
	const x = mouse.x - swiper.offsetLeft;
	const perc = (x / (swiper.offsetWidth / 100)).toFixed(2);
	const clampedPerc = Math.max(0, Math.min(perc, 100));
	swiper.style.setProperty("--offset", `${clampedPerc}%`);
};
swiperContainer.addEventListener("mousemove", e => {
	e.preventDefault();
	mouse.dragCallback = () => calculateSwiperOffset();
});
swiperContainer.addEventListener("mouseleave", () => {
	mouse.dragCallback = false;
});
swiperContainer.addEventListener(
	"touchmove",
	e => {
		mouse.x = e.touches[0].clientX;
		mouse.y = e.touches[0].clientY;
		calculateSwiperOffset();
	},
	supportsPassive ? { passive: true } : false
);

// Put actual weather info in weight slider section
const weatherSection = document.querySelector(".weather-section");
async function getWeather() {
	const response = await fetch(
		"https://api.openweathermap.org/data/2.5/weather?q=Salto,uy?&units=metric&APPID=b0142355ff1172118bcf173d1bd9f022"
	);
	const data = await response.json();

	// slim down output
	const weather = ({ main: { temp, humidity }, wind, dt, timezone }) => ({
		temperature: {
			current: Math.round(temp),
			max: 50,
			min: 0
		},
		humidity: {
			current: humidity,
			max: 100,
			wind
		},
		time: {
			max: 24,
			time: dt + timezone - 2 * 60 * 60
		}
	});

	syncWeatherDataToDOM(weatherDOM(weather(data)));
}

const fns = {
	temperature: ({ current, max }) => {
		const maxFontWeight = 900;
		const steps = (maxFontWeight - 100) / max;
		const weight = 100 + steps * current;

		return { weight, text: `${current}°C` };
	},
	humidity: ({ current, max, wind }) => {
		const maxFontWeight = 900;
		const steps = (maxFontWeight - 100) / max;
		const weight = 100 + steps * current;

		return {
			weight,
			text: `Wind N. at ${wind.speed} km/h<br>${current}% Humidity`
		};
	},
	time: ({ max, time }) => {
		const date = new Date(time * 1000);
		const hours = date.getHours();
		const minutes = `00${date.getMinutes()}`.slice(-2);

		const maxFontWeight = 900;
		const steps = (maxFontWeight - 100) / max;
		const weight = Math.round(100 + steps * hours);

		const day = new Intl.DateTimeFormat("en-US", {
			weekday: "long"
		}).format(date);

		return {
			weight,
			text: `${day} ${hours}:${minutes}`
		};
	}
};

const weatherDOM = data => {
	return Object.entries(data).map(([key, value]) => ({
		[key]: {
			slider: `${key}-slider`,
			element: `${key}`,
			style: `--${key}-slider`,
			[key]: function() {
				return fns[key](value);
			},
			value
		}
	}));
};

const syncWeatherDataToDOM = data => {
	return data.map(item => {
		const key = Object.keys(item);
		const values = item[key][key]();

		const element = weatherSection.querySelector(`.${item[key].element}`);
		const slider = weatherSection.querySelector(`.${item[key].slider}`);

		element.innerHTML = values.text;

		element.style.setProperty(item[key].style, values.weight);
		slider.value = values.weight;

		setupBadge(slider, values.weight);
	});
};

window.onresize = throttle(() => {
	setViewportValues();
	// Recalculate letterWave canvas dimensions
	topWave.resizeCanvas();
	bottomWave.resizeCanvas();
	// Recalculate badge positions
	sliders.forEach(slider => setupBadge(slider, slider.value));
}, 100);

const sliderEnhancements = () => {
	const elements = document.querySelectorAll(".ticks");
	elements.forEach(el => {
		el.addEventListener("click", e => {
			if (e.target.classList.contains("tick-label")) {
				const input = e.target
					.closest(".interactive-controls-tick-slider-container")
					.querySelector("input");
				input.value = e.target.dataset.value;
				setupBadge(input, e.target.dataset.value);
			}
		});
	});
};
