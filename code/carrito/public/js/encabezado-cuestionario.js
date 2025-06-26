class EncabezadoCuestionario extends HTMLElement {
    static get observedAttributes() {
        return ['data-tema'];
    }

    constructor() {
        super();
        
        this.attachShadow({ mode: 'open' });

        this.shadowRoot.innerHTML = `
            <style>
                h2{
                    font-weight: bold;/*Negrita*/
                    font-size: 25px;
                }
                img{
                    width: 50px;
                    height: 50px;
                    margin-right: 10px;
                    border: 1px solid lightgray;
                    vertical-align: text-top;
                }
                .wiki{
                    font-size: 90%;
                }
            </style>
            <h2>
                <img src="" alt="Imagen temática">
                <span>Cargando tema...</span>
            </h2>
            <div class="wiki">Cargando descripción...</div>
        `;
    }

    connectedCallback() {
        this.updateContent();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'data-tema' && oldValue !== newValue) {
            this.updateContent();
        }
    }

    updateContent() {
        const tema = this.getAttribute('data-tema') || 'Tema desconocido';
        const componente = this;

        this.shadowRoot.querySelector('h2 span').textContent = `Cuestionario sobre ${tema}`;
        
        const flickrApiKey = '00d70443816808f854cbee2e3d1b5add';
        const flickrUrl = `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=${flickrApiKey}&text=${encodeURIComponent(tema)}&format=json&nojsoncallback=1&per_page=1&media=photos&sort=relevance&content_type=1&safe_search=1`;

        fetch(flickrUrl)
            .then(response => response.json())
            .then(function (data) {
                const img = componente.shadowRoot.querySelector('img');
                if (data.photos && data.photos.photo.length > 0) {
                    const photo = data.photos.photo[0];
                    const photoUrl = `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_z.jpg`;
                    img.src = photoUrl;
                    img.alt = `Imagen de ${tema}`;
                } else {
                    img.src = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57723/globe_east_540.jpg';
                    img.alt = 'Imagen no disponible';
                }
            })
            .catch(function () {
                const img = componente.shadowRoot.querySelector('img');
                img.src = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57723/globe_east_540.jpg';
                img.alt = 'Error al cargar la imagen';
            });

        const wikipediaUrl = `https://es.wikipedia.org/w/api.php?origin=*&format=json&action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(tema)}`;

        fetch(wikipediaUrl)
            .then(response => response.json())
            .then(function (data) {
                const pages = data.query.pages;
                const page = Object.values(pages)[0];
                const extract = page.extract || 'Descripción no disponible.';
                componente.shadowRoot.querySelector('.wiki').textContent = extract;
            })
            .catch(function () {
                componente.shadowRoot.querySelector('.wiki').textContent = 'Error al cargar la descripción.';
            });
    }
}

customElements.define('encabezado-cuestionario', EncabezadoCuestionario);
