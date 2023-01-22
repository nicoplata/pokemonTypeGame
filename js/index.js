const selected = document.querySelector('.pokemon')
const titleCard = document.querySelector('#titleCard')
const imageCard = document.querySelector('#image')
const healthValue = document.querySelector('#healthValue')
const damageValue = document.querySelector('#damageValue')
const typeValue = document.querySelector('#typeValue')
const titleCardRival = document.querySelector('#titleCardRival')
const imageCardRival = document.querySelector('#imageRival')
const healthValueRival = document.querySelector('#healthValueRival')
const damageValueRival = document.querySelector('#damageValueRival')
const typeValueRival = document.querySelector('#typeValueRival')
const trainerName = document.querySelector('#trainerName')
const trainerPokemon = document.querySelector('#trainerPokemon')
const chatOak = document.querySelector('#chatOak')
const chatAsh = document.querySelector('#chatAsh')
const optionOne = document.querySelector('#optionOne')
const optionTwo = document.querySelector('#optionTwo')
const optionThree = document.querySelector('#optionThree')
const optionOneImg = document.querySelector('#optionOneImg')
const optionTwoImg = document.querySelector('#optionTwoImg')
const optionThreeImg = document.querySelector('#optionThreeImg')
const answers = document.getElementById('answers')

const user = {
    name: '',
    pokemon: '-',
    health: 0,
    damage: 0,
    type: '-'
}

const userRival = {
    pokemon: '-',
    health: 0,
    damage: 0,
    tpye: '-'
}

let textCont = 0

function jsToJson (value) {
    return JSON.stringify(value)
}

function jsonToJs ( chain ){
    return JSON.parse( chain )
}

function dataStorage ( key, value ) {
    const convertedValue = jsToJson( value )
    localStorage.setItem( key, convertedValue )
}

function dataDownload ( key ) {
    return JSON.parse( localStorage.getItem(key) )
}

dataStorage("user", user)

dataDownload ( user )

trainerName.innerHTML = dataDownload ( "user", user ).name
trainerPokemon.innerHTML = dataDownload ( "user", user ).pokemon

const pokemon = user.pokemon

const pokemonSelector = (pokemon) => {
    fetch('https://pokeapi.co/api/v2/pokemon/?offset=0&limit=251')
    .then((response) => response.json())
    .then((data) => {
        const name = data.results
        name.forEach(e => {
            if ( pokemon === e.name){
                const url = e.url
                fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    const name = data.name.toUpperCase()
                    titleCard.innerHTML = name
                    const sprites = data.sprites.other.home
                    imageCard.src = sprites.front_default
                    const stats = data.stats
                    healthValue.innerHTML = stats[0].base_stat
                    user.health = stats[0].base_stat
                    damageValue.innerHTML = stats[1].base_stat
                    user.damage = stats[1].base_stat
                    const type = data.types
                    typeValue.innerHTML = type[0].type.name.toUpperCase()
                    user.type = type[0].type.name.toUpperCase()
                })
                .catch((error) => console.log("error"))
            }
        });
    })
    .catch((error) => console.log("error"))
}

const pokemonSelectorRival = (pokemon) => {
    fetch('https://pokeapi.co/api/v2/pokemon/?offset=0&limit=251')
    .then((response) => response.json())
    .then((data) => {
        const name = data.results
        name.forEach(e => {
            if ( pokemon === e.name){
                const url = e.url
                fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    const name = data.name.toUpperCase()
                    titleCardRival.innerHTML = name
                    const sprites = data.sprites.other.home
                    imageCardRival.src = sprites.front_default
                    const stats = data.stats
                    healthValueRival.innerHTML = stats[0].base_stat
                    userRival.health = stats[0].base_stat
                    damageValueRival.innerHTML = stats[1].base_stat
                    userRival.damage = stats[1].base_stat
                    const type = data.types
                    typeValueRival.innerHTML = type[0].type.name.toUpperCase()
                    userRival.type = type[0].type.name.toUpperCase()
                })
                .catch((error) => console.log("error"))
            }
        });
    })
    .catch((error) => console.log("error"))
}

function quickAttack (attacker, defender) {
    return (defender = Math.round(defender - (attacker*0.1)))
}

function heavyAttack (attacker, defender) {
    return (defender = Math.round(defender - (attacker*0.3)))
}

function specialAttack (attacker, defender) {
    return (defender = Math.round(defender - (attacker*0.5)))
}

answers.addEventListener('click', (event) => {
    if( event.target.tagName === 'BUTTON' || event.target.tagName === 'IMG' ){
        if ( event.target.id === 'optionOne' || event.target.id == 'optionOneImg') {
            clickOptionOne ()
        } else if ( event.target.id === 'optionTwo' || event.target.id == 'optionTwoImg') {
            clickOptionTwo ()
        } else if ( event.target.id === 'optionThree' || event.target.id == 'optionThreeImg') {
            clickOptionThree () 
        }
    }
})

const clickOptionOne = () => {
    if ( textCont == 6 ) {

        user.pokemon = 'BULBASAUR'
        dataStorage("user", user)
        dataDownload ( user )
        trainerPokemon.innerHTML = user.pokemon
        pokemonSelector(user.pokemon.toLowerCase())

        optionOneImg.src = ''
        optionTwoImg.src = ''
        optionThreeImg.src = './img/arrowRight.png'

        fetch('./js/text.json')
        .then((response) => response.json())
        .then((data) => {
            const array = data.text
            chatOak.innerHTML = array[textCont].text
            textCont++
        })
        .catch((error) => console.log("error"))

    } else if ( textCont == 11 ) {

        userRival.pokemon = 'CHIKORITA'
        pokemonSelectorRival(userRival.pokemon.toLowerCase())

        optionOne.innerHTML= 'ATAQUE RAPIDO'
        optionTwo.innerHTML = 'ATAQUE PESADO'
        optionThree.innerHTML = 'ATAQUE ESPECIAL'

        fetch('./js/text.json')
        .then((response) => response.json())
        .then((data) => {
            const array = data.text
            chatOak.innerHTML = array[textCont].text
            textCont++
        })
        .catch((error) => console.log("error"))

    } else if ( textCont == 12 ) {
        userRival.health = quickAttack(user.damage, userRival.health)
        
        if ( userRival.health <= 0 ){
            
            userRival.health = 0
            healthValueRival.innerHTML = userRival.health

            textCont = 16

            return

        } else if ( user.health <= 0 ){

            user.health = 0
            healthValue.innerHTML = user.health

            textCont = 17

            return

        }

        healthValueRival.innerHTML = userRival.health

        chatOak.innerHTML = `${user.pokemon} ha realizado ${Math.round(user.damage*0.1)} de daño`

        optionOne.innerHTML= ''
        optionTwo.innerHTML = ''
        optionThree.innerHTML = '<img id="optionThreeImg" src="./img/arrowRight.png" alt=""></img>'

        attackType = 1

        textCont++

        return

    } 
}

const clickOptionTwo = () => {
    if ( textCont == 6 ) {

        user.pokemon = 'CHARMANDER'
        dataStorage("user", user)
        dataDownload ( user )
        trainerPokemon.innerHTML = user.pokemon
        pokemonSelector(user.pokemon.toLowerCase())

        optionOneImg.src = ''
        optionTwoImg.src = ''
        optionThreeImg.src = './img/arrowRight.png'

        fetch('./js/text.json')
        .then((response) => response.json())
        .then((data) => {
            const array = data.text
            chatOak.innerHTML = array[textCont].text
            textCont++
        })
        .catch((error) => console.log("error"))

    } else if ( textCont == 11 ) {

        userRival.pokemon = 'CYNDAQUIL'
        pokemonSelectorRival(userRival.pokemon.toLowerCase())

        optionOne.innerHTML= 'ATAQUE RAPIDO'
        optionTwo.innerHTML = 'ATAQUE PESADO'
        optionThree.innerHTML = 'ATAQUE ESPECIAL'

        fetch('./js/text.json')
        .then((response) => response.json())
        .then((data) => {
            const array = data.text
            chatOak.innerHTML = array[textCont].text
            textCont++
        })
        .catch((error) => console.log("error"))

    } else if ( textCont == 12 ) {

        userRival.health = heavyAttack(user.damage, userRival.health)
        if ( userRival.health <= 0 ){

            userRival.health = 0
            healthValueRival.innerHTML = userRival.health

            textCont = 16

            return

        } else if ( user.health <= 0 ){

            user.health = 0
            healthValue.innerHTML = user.health

            textCont = 17

            return

        }

        healthValueRival.innerHTML = userRival.health

        chatOak.innerHTML = `${user.pokemon} ha realizado ${Math.round(user.damage*0.3)} de daño`

        optionOne.innerHTML= ''
        optionTwo.innerHTML = ''
        optionThree.innerHTML = '<img id="optionThreeImg" src="./img/arrowRight.png" alt=""></img>'

        attackType = 2

        textCont++

        return

    } 
}

const clickOptionThree = () => {
    if ( textCont === 1 ){

        chatAsh.innerHTML ='<input id="nameInput" type="text">'
        const nameInput = document.querySelector('#nameInput')

        nameInput.oninput = () => {
            user.name = nameInput.value.toUpperCase()
            dataStorage("user", user)
            dataDownload ( user )
            trainerName.innerHTML = user.name
        }
        
    } else if ( textCont == 2){

        chatAsh.innerHTML =''

    } else if ( textCont == 5 ) {

        optionOneImg.src = './img/001bulbasaur.png'
        optionTwoImg.src = './img/004charmander.png'
        optionThreeImg.src = './img/007squirtle.png'

    } else if ( textCont == 6 ) {
        
        user.pokemon = 'SQUIRTLE'
        dataStorage("user", user)
        dataDownload ( user )
        trainerPokemon.innerHTML = user.pokemon
        pokemonSelector(user.pokemon.toLowerCase())
        optionOneImg.src = ''
        optionTwoImg.src = ''
        optionThreeImg.src = './img/arrowRight.png'
        
    } else if ( textCont == 10 ) {

        optionOneImg.src = './img/152chikorita.png'
        optionTwoImg.src = './img/155cyndaquil.png'
        optionThreeImg.src = './img/158totodile.png'

    } else if ( textCont == 11 ) {

        userRival.pokemon = 'TOTODILE'
        pokemonSelectorRival(userRival.pokemon.toLowerCase())

        optionOne.innerHTML= 'ATAQUE RAPIDO'
        optionTwo.innerHTML = 'ATAQUE PESADO'
        optionThree.innerHTML = 'ATAQUE ESPECIAL'

    } else if ( textCont == 12 ) {

        optionOne.innerHTML= ''
        optionTwo.innerHTML = ''
        optionThree.innerHTML = '<img id="optionThreeImg" src="./img/arrowRight.png" alt=""></img>'

        userRival.health = specialAttack(user.damage, userRival.health)

        if ( userRival.health <= 0 ){

            userRival.health = 0
            healthValueRival.innerHTML = userRival.health

            textCont = 16

            return

        } 
        
        healthValueRival.innerHTML = userRival.health

        chatOak.innerHTML = `${user.pokemon} ha realizado ${Math.round(user.damage*0.5)} de daño`

        attackType = 3

        textCont++
        
        return

    } else if ( textCont == 13 ) {

        fetch('./js/text.json')
        .then((response) => response.json())
        .then((data) => {
            const array = data.text
            chatOak.innerHTML = array[13].text
            textCont++
        })
        .catch((error) => console.log(error))

        switch ( attackType ){
            case  1 : 
                user.health = quickAttack(userRival.damage, user.health);
            break
            case 2 :
                user.health = heavyAttack(userRival.damage, user.health)
            break
            case 3 :
                user.health = specialAttack(userRival.damage, user.health)
            break
        }

        if ( user.health <= 0 ){

            user.health = 0
            healthValue.innerHTML = user.health

            textCont = 16

        }

        healthValue.innerHTML = user.health

        return

    } else if ( textCont == 14 ){

        switch ( attackType ){
            case  1 : 
            chatOak.innerHTML = `${userRival.pokemon} ha realizado ${Math.round(userRival.damage*0.1)} de daño`
            break
            case 2 :
                chatOak.innerHTML = `${userRival.pokemon} ha realizado ${Math.round(userRival.damage*0.3)} de daño`
            break
            case 3 :
                chatOak.innerHTML = `${userRival.pokemon} ha realizado ${Math.round(userRival.damage*0.5)} de daño`
            break
        }

        if (user.health > 0){
            
            textCont++

        }

        return

    } else if ( textCont == 15 ){

        fetch('./js/text.json')
        .then((response) => response.json())
        .then((data) => {
            const array = data.text
            chatOak.innerHTML = array[textCont].text
            textCont = 12
        })
        .catch((error) => console.log("error"))

        optionOne.innerHTML= 'ATAQUE RAPIDO'
        optionTwo.innerHTML = 'ATAQUE PESADO'
        optionThree.innerHTML = 'ATAQUE ESPECIAL'

        return

    } else if ( textCont == 16 ) {

        Swal.fire({
            title: 'GANASTE!',
            text: '¿Desea jugar nuevamente?',
            icon: 'success',
            confirmButtonText: 'SI!',
            denyButtonText: 'NO',
            showDenyButton: true
        }).then((result) => {
            if (result.isConfirmed) {
              window.location.reload()
            } else if (result.isDenied) {
                
            }
        })

    } else if ( textCont == 17 ){

        Swal.fire({
            title: 'PERDISTE!',
            text: '¿Desea jugar nuevamente?',
            icon: 'warning',
            confirmButtonText: 'SI!',
            denyButtonText: 'NO',
            showDenyButton: true
        }).then((result) => {
            if (result.isConfirmed) {
              window.location.reload()
            } else if (result.isDenied) {
                
            }
        })
    }

    if ( user.name == '' && textCont === 2 ){
        
        Swal.fire({
            title: 'ATENCION!',
            text: 'Ingrese un nombre válido',
            icon: 'warning',
            confirmButtonText: 'Aceptar',
        }).then((result) => {
        })

        chatAsh.innerHTML ='<input id="nameInput" type="text">'
        const nameInput = document.querySelector('#nameInput')

        nameInput.oninput = () => {
            user.name = nameInput.value.toUpperCase()
            dataStorage("user", user)
            dataDownload ( user )
            trainerName.innerHTML = user.name
        }
        
    } else {

        console.log(textCont)

        fetch('./js/text.json')
        .then((response) => response.json())
        .then((data) => {
            const array = data.text
            chatOak.innerHTML = array[textCont].text
            textCont++
        })
        .catch((error) => console.log(''))
    }
}