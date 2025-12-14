document.addEventListener('DOMContentLoaded', function() {

    var slider = document.getElementById('uikit-slider');
    var startVal = document.getElementById('slider-start-val');
    var endVal = document.getElementById('slider-end-val');
    
    // Soft Limits definition
    var minYear = 2015;
    var maxYear = 2024;

    if (slider) {
        noUiSlider.create(slider, {
            range: { 'min': 2013, 'max': 2026 },
            start: [2015, 2024], 
            connect: true,
            step: 1,
            tooltips: false,
            pips: {
                mode: 'steps',
                density: 10,
                filter: function (value) {
                    if (value < minYear || value > maxYear) return -1;
                    return 1;
                }
            }
        });

        // --- VISUAL UPDATES (Text & Colors) ---
        slider.noUiSlider.on('update', function (values, handle) {
            var value = Math.round(values[handle]);
            
            // Update Text Labels
            if (startVal && handle === 0) startVal.innerText = value;
            if (endVal && handle === 1) endVal.innerText = value;

            // Bounce Logic Visuals (Red Border)
            var handleElement = slider.querySelectorAll('.noUi-handle')[handle];
            if (value < minYear || value > maxYear) {
                handleElement.style.borderColor = '#f0506e'; 
            } else {
                handleElement.style.borderColor = '#e5e5e5'; 
            }

            // Pip Highlighting
            var allPips = slider.querySelectorAll('.noUi-value');
            allPips.forEach(p => p.classList.remove('uk-pip-active'));
            
            var currentVals = slider.noUiSlider.get().map(Number);
            currentVals.forEach(val => {
                var activePip = slider.querySelector(`.noUi-value[data-value="${Math.round(val)}"]`);
                if (activePip) activePip.classList.add('uk-pip-active');
            });
        });

        // --- LOGIC UPDATES (Broadcast Event) ---
        slider.noUiSlider.on('change', function (values) {
            var min = Math.round(values[0]);
            var max = Math.round(values[1]);

            // Enforce Soft Limits (Bounce Back)
            if (min < minYear) { slider.noUiSlider.set([minYear, null]); min = minYear; }
            if (max > maxYear) { slider.noUiSlider.set([null, maxYear]); max = maxYear; }

            // DISPATCH CUSTOM EVENT
            const event = new CustomEvent('yearRangeChanged', { 
                detail: { min: min, max: max } 
            });
            document.dispatchEvent(event);
        });

        // --- CLICKABLE PIPS ---
        var pips = slider.querySelectorAll('.noUi-value');
        pips.forEach(pip => {
            pip.addEventListener('click', function() {
                var clickedValue = Number(this.getAttribute('data-value'));
                var currentValues = slider.noUiSlider.get().map(Number);
                var dist0 = Math.abs(currentValues[0] - clickedValue);
                var dist1 = Math.abs(currentValues[1] - clickedValue);
                if (dist0 < dist1) slider.noUiSlider.set([clickedValue, null]);
                else slider.noUiSlider.set([null, clickedValue]);
            });
        });
    }
});