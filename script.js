'use strict';

class Workout {
    clicks = 0;
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance; //in km
        this.duration = duration; //in min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}
       ${this.date.getDate()}
       `;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration); //initialize this key word
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration); //initialize this key word
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}


/////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];
    editMode = false;
    currentWorkout;

    constructor() {
        // Get users position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Set up event listeners
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    }

    // Find selected edit/delete listing workout
    _findSelectedWorkout($event) {
        const workoutId = $event.target.closest('.workout').getAttribute('data-id');
        this.currentWorkout = this.#workouts.find(workout => workout.id === workoutId);
    }
    // Edit a workout
    _editWorkout($event) {
       this._findSelectedWorkout($event);
        this.editMode = true;
        $event.stopPropagation();
        form.classList.remove('hidden');
    }

    // Delete the workout
    _deleteWorkout($event) {
       this._findSelectedWorkout($event);
       this.#workouts.find((workout, i) => {
           if(workout.id === this.currentWorkout.id) {
               this.#workouts.splice(i,1);
               this._setLocalStorage();
               location.reload();
               return
           }
       })
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function (err) {
            })

        }
    }

    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
        const coords = [latitude, longitude]
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Handling clicks on the map
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout => {
            this._renderWorkoutMarker(workout);
        })
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // clear inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid'
        }, 1000)
    }

    _updateWorkout() {
        this.#workouts.find((workout, i) => {
            if(workout.id === this.currentWorkout.id) {
                this.#workouts.splice(i,1);
                this.#workouts[i] = this.currentWorkout;
                this._setLocalStorage();
                location.reload();
                return
            }
        })
    }
    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));

            const allPositive = (...inputs) => inputs.every(inp => inp > 0)
            e.preventDefault();

        // Get the data from the form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const lat = this.#mapEvent?.latlng.lat;
        const lng = this.#mapEvent?.latlng.lng;
        let workout;

            // If workout running, create running object
            if (type === 'running') {
                const cadence = +inputCadence.value;
                // Check if data is valid

                if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                    return alert('Inputs have to be positive numbers!');
                }

                if (!this.editMode) {
                    workout = new Running([lat, lng], distance, duration, cadence);
                }

                // Update the current workout with new form value
                if (this.editMode) {
                    if (type.toLowerCase() === 'running') {
                        this.currentWorkout.description = this.currentWorkout.description.replace('Cycling', 'Running');
                    }
                    if (type.toLowerCase() === 'cycling') {
                        this.currentWorkout.description = this.currentWorkout.description.replace('Running', 'Cycling');
                    }

                    this.currentWorkout.type = type;
                    this.currentWorkout.distance = distance;
                    this.currentWorkout.duration = duration;
                    this.currentWorkout.cadence = cadence;
                    this.currentWorkout.pace = (duration/distance);
                }
            }
            // If workout cycling, create cycling object
            if (type === 'cycling') {
                const elevation = +inputElevation.value;
                // Check if data is valid
                if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
                    return alert('Inputs have to be positive numbers!');
                }
                if (!this.editMode) {
                    workout = new Cycling([lat, lng], distance, duration, elevation);
                }
                if (this.editMode) {
                    if (type.toLowerCase() === 'running') {
                        this.currentWorkout.description = this.currentWorkout.description.replace('Cycling', 'Running');
                        this._updateWorkout();
                    }
                    if (type.toLowerCase() === 'cycling') {
                        this.currentWorkout.description = this.currentWorkout.description.replace('Running', 'Cycling');
                        this._updateWorkout();
                    }
                    this.currentWorkout.type = type;
                    this.currentWorkout.distance = distance;
                    this.currentWorkout.duration = duration;
                    this.currentWorkout.elevationGain = elevation;
                    this.currentWorkout.speed = (distance / duration / 60);
                }
            }

            // Add new object to workout array
            if (this.editMode) {
                this.#workouts.find((workout, i)=> {
                    if (workout.id === this.currentWorkout.id) {
                        // Hide the form & Clear input fields
                        // this._hideForm();
                        //set local storage
                        this._renderWorkout(this.currentWorkout);
                        this._setLocalStorage()
                        location.reload();
                        return
                    }
                })
            }
            this.#workouts.push(workout);

            // Render workout on map as marker
            this._renderWorkoutMarker(workout);

            // Render workout on list
            this._renderWorkout(workout);

            // Hide the form & Clear input fields
            this._hideForm();

        //set local storage
        this._setLocalStorage()
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                autoClose: false,
                closeOnClick: false,
                maxWidth: 250,
                minWidth: 100,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃' : '‍♂'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
          <span class="workout__edit">Edit</span>
          <span class="workout__delete">Delete</span>  
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃' : '‍♂'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

        if (workout.type === 'running') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>`;
        }

        if (workout.type === 'cycling') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>`;
        }
        form.insertAdjacentHTML('afterend', html);
        const editWorkoutBtn = document.querySelector('.workout__edit');
        const deleteWorkoutBtn = document.querySelector('.workout__delete');
        editWorkoutBtn.addEventListener('click', this._editWorkout.bind(this));
        deleteWorkoutBtn.addEventListener('click', this._deleteWorkout.bind(this));
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout')
        if (!workoutEl) {
            return
        };

        const workout = this.#workouts.find(workout => workout.id === workoutEl.dataset.id);
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

        //using the public interface
        // workout.click();
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        console.log(data);

        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(workout => {
            this._renderWorkout(workout);
        })
    }

    _reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();


