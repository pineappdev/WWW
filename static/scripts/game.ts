// let nunjucks = require('nunjucks');

/************************************ GLOBALS *********************************/
let game_duration = 200;
let initial_credits = 2000;
let ships: Object = {};
let planets: Object = {};
let items: Item[];
let credits = initial_credits;
let clock: Clock;

let json_ships: Object;
let json_planets: Object;
let json_items: any;

let first_planet_displayed: number = 0;
let first_ship_displayed: number = 0; 

let json_path = "../../initial/initial_data.json";

let current_player = "";

let planetPopUpItemNum = 0;
let shipPopUpItemNum = 0;

/********************************** CLASSES ***********************************/

class Clock
{
    private time_left: number;
    private timestep = 1000; // 2 seconds

    constructor(game_time: number)
    {
        if(game_time <= 0)
        {
            alert("End time of the game is set to 0");
        }
        this.time_left = game_time;
        this.actualiseTimeOnScreen();

        setTimeout(() => {this.tick()}, this.timestep);
    }

    public getTimeLeft() : number
    {
        return this.time_left;
    }

    private tick() : void
    {
        if(this.time_left > 0)
        {
            this.time_left -= 1;
            this.actualiseTimeOnScreen();
            setTimeout(() => {this.tick()}, this.timestep);
        }
        else
        {
            endGame();
        }
    }

    private actualiseTimeOnScreen(): void
    {
        document.getElementById("timeText").innerHTML = "" + this.time_left;
    }

    public getTimeStep() : number
    {
        return this.timestep;
    }
}

class Item
{
    private name: string;
    constructor(name: string)
    {
        this.name = name;
    }

    public getName() : string
    {
        return this.name;
    }
}

class QuantityItem extends Item
{
    protected amount: number;
    constructor(name: string, amount: number)
    {
        super(name);
        this.amount = amount;
    }
    
    public getAmountAsString() : string
    {
        return '' + this.amount;
    }

    public getAmount() : number
    {
        return this.amount;
    }

    public increaseAmount(amount: number)
    {
        this.amount += amount;
    }
}

class SellableItem extends QuantityItem
{
    private sell_price: number;
    private buy_price: number;
    constructor(name: string, amount: number, buy_price: number, sell_price: number)
    {
        super(name, amount);
        this.sell_price = sell_price;
        this.buy_price = buy_price;
    }

    public getSellPriceAsString() : string
    {
        return '' + this.sell_price;
    }

    public getBuyPriceAsString() : string
    {
        return '' + this.buy_price;
    }

    public decreaseAmount(amount: number) : boolean
    {
        if(amount > this.amount || amount < 0)
        {
            return false;
        }
        else
        {
            this.amount -= amount;
        }
        return true;
    }

    public increaseAmount(amount: number) : boolean
    {
        if(amount < 0) return false;
        else this.amount += amount;
        return true;
    }

    public getBuyPrice() : number
    {
        return this.buy_price;
    }

    public getSellPrice() : number
    {
        return this.sell_price;
    }
}

class Position
{
    private x: number;
    private y: number;
    constructor(x: number, y: number)
    {
        this.x = x;
        this.y = y;
    }

    public getPositionAsString() : string
    {
        return this.x + ", " + this.y;
    }

    public getDistanceTo(position: Position): number
    {
        return Math.round(Math.sqrt((Math.pow(this.x - position.x, 2) + Math.pow(this.y - position.y, 2))));
    }
}

class Starship
{
    private name: string;
    private maximum_cargo_hold_size: number;
    private cargo_size: number = 0;
    private current_planet_name: string;
    private speed: number;
    private items: Object;

    constructor(name: string, cargo_hold_size: number, current_planet_name: string, items: Object)
    {
        this.name = name;
        this.maximum_cargo_hold_size = cargo_hold_size;
        this.current_planet_name = current_planet_name;
        this.items = items;
        this.speed = 1;
        
        for(let item_name in items)
        {
            this.cargo_size += items[item_name].getAmount();
        }

        if(this.cargo_size > this.maximum_cargo_hold_size) alert("Ship " + this.getName() + " has cargo overload on constructor!!!");
        if(this.current_planet_name == undefined || this.current_planet_name == "" || planets[this.current_planet_name] == undefined)
            alert("Ship " + this.getName() + " is located on an unexisting planet in constructor!!!");
    }

    public getLocation() : string
    {
        return this.current_planet_name;
    }
    
    public getName() : string
    {
        return this.name;
    }

    public getItems() : Object
    {
        return this.items;
    }

    public getMaximumCargoCapacity() : string
    {
        return "" + this.maximum_cargo_hold_size;
    }

    public getCargoSize() : string
    {
        return "" + this.cargo_size;
    }

    public buyItem(item_name: string, amount: number) : string
    {
        let errorMsg: string;
        
        if(this.current_planet_name == "" || this.current_planet_name == undefined)
        {
            return "Ship's not on a planet now, you can't buy items";
        }
        
        if(planets[this.current_planet_name] == undefined) return "Error, planet on which ship's located doesn't exist";
        
        if(this.cargo_size + amount > this.maximum_cargo_hold_size)
            return "Ship can hold a maximum amount of cargo " + this.maximum_cargo_hold_size +
                   " and buying " + amount + " of " + item_name + " will cause the ship's overload";
        
        if(amount * planets[this.current_planet_name].getItemBuyPrice(item_name) > credits)
        {
            return "You don't have enough credits";
        }

        if((errorMsg = planets[this.current_planet_name].sellItem(item_name, amount)) != "") return errorMsg;
        
        credits -= amount * planets[this.current_planet_name].getItemBuyPrice(item_name);
        this.cargo_size += amount;
        
        if(this.getItems()[item_name] == undefined)
        {
            this.getItems()[item_name] = new QuantityItem(item_name, amount);
        }
        else
        {
            this.getItems()[item_name].increaseAmount(amount);
        }
        
        return "";
    }

    public sellItem(item_name: string, amount: number) : string
    {
        let errorMsg: string;
        if(this.current_planet_name == "" || this.current_planet_name == undefined)
        {
            return "Ship's not on a planet now, you can't sell items";
        }
        if(planets[this.current_planet_name] == undefined) return "Error, planet on which ship's located doesn't exist";

        if(this.getItems()[item_name] == undefined || this.getItems()[item_name].getAmount() <= 0)
        {
            return "You don't have this item, can't sell it";
        }
        
        if(this.getItems()[item_name].getAmount() < amount)
        {
            return "You don't have enough of this item, you can't sell it";
        }

        if((errorMsg = planets[this.current_planet_name].buyItem(item_name, amount)) != "") return errorMsg;
        
        credits += amount * planets[this.current_planet_name].getItemSellPrice(item_name);
        this.cargo_size -= amount;

        this.getItems()[item_name].increaseAmount(-1 * amount);
        
        if(this.getItems()[item_name].getAmount() == 0)
        {
            delete this.items[item_name];
        }

        return "";
    }

    public howLongTo(planet_name: string) : number
    {
        if(planet_name == undefined || planets[planet_name] == undefined) return -1;

        let distance: number = planets[this.getLocation()].getDistanceTo(planets[planet_name]);
        let travel_time: number = distance / this.speed;
        
        return travel_time;
    }

    public travelTo(planet_name: string) : string
    {
        if(this.getLocation() == planet_name)
        {
            return "You can't travel to the planet you're currently on";
        }
        else if(planet_name == undefined || planets[planet_name] == undefined)
        {
            return "Error occured - planet_name's undefined";
        }
        else if(this.getLocation() == "" || this.getLocation() == undefined)
        {
            return "You're travelling already, can't change destination during hyperspace jump";
        }

        let distance: number = planets[this.getLocation()].getDistanceTo(planets[planet_name]);
        let travel_time: number = distance / this.speed;
        this.changeLocationTo("");

        if(travel_time < clock.getTimeLeft())
        {
            setTimeout(() => {this.changeLocationTo(planet_name);}, travel_time * clock.getTimeStep());
        }

        return "";
    }

    private changeLocationTo(planet_name: string)
    {
        this.current_planet_name = planet_name;
        arriveOnPlanet(this.getName(), planet_name);
    }
}

class TravelToSelfError extends Error
{
    constructor(message: string)
    {
        super(message);
    }
}

class Planet
{
    private name: string;
    private items: Object;
    private position: Position;

    constructor(name: string, items: Object, position: Position)
    {
        this.name = name;
        this.items = items;
        this.position = position;
    }

    public getPositionAsString() : string
    {
        return this.position.getPositionAsString();
    }

    public getItems() : Object
    {
        return this.items;
    }

    public hasItem(item_name: string) : boolean
    {
        return item_name in this.items;
    }

    public getItemBuyPrice(item_name: string) : number
    {
        return this.items[item_name].getBuyPrice();
    }

    public getItemSellPrice(item_name: string) : number
    {
        return this.items[item_name].getSellPrice();
    }

    public sellItem(item_name : string, amount: number) : string
    {
        if(!this.hasItem(item_name)) return "No item " + item_name + " on this planet";
        if(!this.items[item_name].decreaseAmount(amount)) return "This item's run out";
        return "";
    }

    public buyItem(item_name : string, amount: number) : string
    {
        if(!this.hasItem(item_name)) return "No item " + item_name + " on this planet";
        if(!this.items[item_name].increaseAmount(amount)) return "You don't have enough of this item";
        return "";
    }

    public getDockedShips() : string[]
    {
        let docked_ships = new Array();

        for(let ship in ships)
        {
            if(ships[ship].getLocation() == this.name)
            {
                docked_ships.push(ship);
            }
        }

        return docked_ships;
    }

    public getDistanceTo(planet: Planet)
    {
        return this.position.getDistanceTo(planet.position);
    }
}


/*********************************** PARSE DATA FROM JSON *****************************/

function loadJson(json: string)
{
    let parsed = JSON.parse(json);

    function parseFrom(arr: Object)
    {
        for(let i in arr)
        {
            if(i == "game_duration")
            {
                game_duration = arr[i];
            }
            else if(i == "initial_credits")
            {
                initial_credits = arr[i];
            }
            else if(i == "items")
            {
                json_items = arr[i];
            }
            else if(i == "planets")
            {
                json_planets = arr[i];
            }
            else if(i == "starships")
            {
                json_ships = arr[i];
            }
        }
    }

    parseFrom(parsed);
}

function createObjectsFromJson()
{
    function parseItems()
    {
        items = new Array(json_items.length);
        for(let idx in json_items)
        {
            items[idx] = new Item(json_items[idx]);
        }
    }

    function parsePlanet(planet: Object, planet_name: string)
    {
        let position: Position = new Position(planet["x"], planet["y"]);
        let planet_items: SellableItem[] = new Array();
        for(let item_name in planet["available_items"])
        {
            planet_items[item_name] =
                new SellableItem(item_name,
                    planet["available_items"][item_name]["available"],
                    planet["available_items"][item_name]["buy_price"],

                    planet["available_items"][item_name]["sell_price"]);
        }
        return new Planet(planet_name, planet_items, position);
    }

    function parsePlanets()
    {
        for(let planet_name in json_planets)
        {
            planets[planet_name] = parsePlanet(json_planets[planet_name], planet_name);
        }
    }

    function parseShip(ship: Object, ship_name: string)
    {
        return new Starship(ship_name, ship["cargo_hold_size"], ship["position"], new Object());
    }

    function parseStarships()
    {
        for(let ship_name in json_ships)
        {
            ships[ship_name] = parseShip(json_ships[ship_name], ship_name);
        }
    }

    parseItems();
    parsePlanets();
    parseStarships();
}



/**************************** MAIN PLANETS DISPLAY ***********************/
function displayPlanets()
{
    let planets_names = Object.keys(planets);
    let i: number;
    for(i = 1; i < planets_names.length && i < 7; i++)
    {
        document.getElementById("mainPlanetContainer").innerHTML +=
        '<div id="planet' + i + '" class="planet">\
            <div class="planetTitleContainer">' + (i < planets_names.length ? planets_names[i - 1] : "Empty") + '</div>\
            <!--<div class="planetDescriptionContainer">\
                <span class="planetDescriptionText">Description</span>\
            </div>-->\
            <div class="planetImageContainer">\
                <img src="/static/Images/' + planets_names[i - 1] + '" class="planetImage" onclick=\'popUpPlanet("' + escapeRegExp(planets_names[i - 1]) + '")\'>\
            </div>\
        </div>\
        ';
    }
}

function displayScrolledPlanets()
{
    let i: number;
    let planets_names = Object.keys(planets);
    for(i = first_planet_displayed; i < first_planet_displayed + 6 && i < planets_names.length; i++)
    {
        let div = document.getElementById("planet" + (i - first_planet_displayed + 1));
        div.lastElementChild.firstElementChild.setAttribute("src", "/static/Images/" + planets_names[i]);
        div.lastElementChild.firstElementChild.setAttribute("onclick", 'popUpPlanet("' + escapeRegExp(planets_names[i]) + '")');
        div.firstElementChild.innerHTML = planets_names[i];
    }

    for(; i < first_planet_displayed + 6; i++)
    {
        let div = document.getElementById("planet" + (i - first_planet_displayed + 1));
        div.lastElementChild.firstElementChild.setAttribute("src", "/static/Images/Empty");
        div.lastElementChild.firstElementChild.setAttribute("onclick", "");
        div.firstElementChild.innerHTML = "Empty";
    }
}

function scrollPlanetsForward()
{
    let planets_names = Object.keys(planets);
    if(planets_names.length > first_planet_displayed + 6)
    {
        first_planet_displayed += 6;
    }
    else
    {
        first_planet_displayed = 0;
    }

    displayScrolledPlanets();
}

function scrollPlanetsBackward()
{
    let planets_names = Object.keys(planets);
    if(first_planet_displayed >= 6)
    {
        first_planet_displayed -= 6;
    }
    else
    {
        first_planet_displayed = planets_names.length - planets_names.length % 6;
        if(first_planet_displayed == planets_names.length)
        {
            first_planet_displayed = planets_names.length - 6;
        }
    }
    displayScrolledPlanets();
}

/***************************** MAIN SHIPS DISPLAY ***********************************/

function displayShips()
{
    let ship_names = Object.keys(ships);
    let i: number;
    for(i = 1; i < ship_names.length && i < 6; i++)
    {
        document.getElementById("containerOfShips").innerHTML +=
        '<div class="shipContainer" id="ship' + i + '">\
                        <div class="shipDesctiprionContainer">\
                            <div class="shipNameContainer">' + ship_names[i - 1] + '</div>\
                        </div>\
                        \
                        <div class="shipImageContainer" onclick=\'popUpShip("' + escapeRegExp(ship_names[i - 1]) + '")\'>\
                            <img src="/static/Images/' + ship_names[i - 1] + '" class="shipImage">\
                        </div>\
                    </div>\
        ';
    }
}

function displayScrolledShips()
{
    let i: number;
    let ship_names = Object.keys(ships);
    for(i = first_ship_displayed; i < first_ship_displayed + 5 && i < ship_names.length; i++)
    {
        let div = document.getElementById("ship" + (i - first_ship_displayed + 1));
        div.firstElementChild.firstElementChild.innerHTML = ship_names[i];
        div.lastElementChild.lastElementChild.setAttribute("src", "/static/Images/" + ship_names[i]);
        div.getElementsByClassName("shipImageContainer")[0].setAttribute("onclick", "popUpShip(\"" + escapeRegExp(ship_names[i]) + "\")");
    }

    for(; i < first_ship_displayed + 5; i++)
    {
        let div = document.getElementById("ship" + (i - first_ship_displayed + 1));
        div.firstElementChild.firstElementChild.innerHTML = "Empty";
        div.lastElementChild.lastElementChild.setAttribute("src", "/static/Images/Empty");
        div.getElementsByClassName("shipImageContainer")[0].setAttribute("onclick", "");
    }
}

function scrollShipsForward()
{
    let ship_names = Object.keys(ships);
    if(ship_names.length > first_ship_displayed + 5)
    {
        first_ship_displayed += 5;
    }
    else
    {
        first_ship_displayed = 0;
    }

    displayScrolledShips();
}

function scrollShipsBackward()
{
    let ship_names = Object.keys(ships);
    if(first_ship_displayed >= 5)
    {
        first_ship_displayed -= 5;
    }
    else
    {
        first_ship_displayed = ship_names.length - ship_names.length % 5;
        if(first_ship_displayed == ship_names.length)
        {
            first_ship_displayed = ship_names.length - 5;
        }
    }
    displayScrolledShips();
}

/********************************** GENERAL POPUPS ***************************/

function activateModal()
{
    let modal = document.getElementById("modal");
    modal.style.display = "block";
}

function deactivateModal()
{
    let modal = document.getElementById("modal");
    modal.style.display = "none";
}

function closePlanetPopup()
{
    let planetPopUp = document.getElementById("planetPopUp");
    planetPopUp.style.display = "none";

    deactivateModal();
}

function closeShipPopUp()
{
    let shipPopUp = document.getElementById("shipPopUp");
    shipPopUp.style.display = "none";

    deactivateModal();
}

/********************************** PLANET POPUP *****************************/

function popUpPlanet(planet_name: string)
{
    let planetPopUp = document.getElementById("planetPopUp");
    planetPopUp.style.display = "grid";

    planetPopUp.getElementsByClassName("planetNameHolder")[0].innerHTML = planet_name;
    planetPopUp.getElementsByClassName("planetImageHolder")[0].setAttribute("src", "/static/Images/" + planet_name);
    planetPopUp.getElementsByClassName("planetLocationHolder")[0].firstElementChild.innerHTML = "[" + planets[planet_name].getPositionAsString() + "]";

    planetPopUpItemNum = 0;

    displayScrolledItemsOnPlanet(planet_name);

    displayDockedShips(planet_name);
    
    closeShipPopUp();

    activateModal();
}

function displayDockedShips(planet_name: string)
{
    let planetPopUp = document.getElementById("planetPopUp");

    let docked_ships = planets[planet_name].getDockedShips();
    planetPopUp.getElementsByClassName("ShipsAndArrowsHolder")[0].innerHTML =
    // '<span style="animation: none; display: flex; align-items: center;" class="leftArrowAnimation">🢐</span>\
     '<div class="shipsHolder">\
    ';

    for(let ship_name in docked_ships)
    {
        planetPopUp.getElementsByClassName("ShipsAndArrowsHolder")[0].innerHTML +=
        '<div class="ShipHolder">\
            <div class="shipNameHolder">\
                ' + ships[docked_ships[ship_name]].getName() + '\
            </div>\
            <div class="shipImageHolder" onclick=\'popUpShip(\"' + escapeRegExp(ships[docked_ships[ship_name]].getName()) + '\")\'>\
                <img src="/static/Images/' + ships[docked_ships[ship_name]].getName() + '">\
            </div>\
        </div>\
        '; 
    }

    planetPopUp.getElementsByClassName("ShipsAndArrowsHolder")[0].innerHTML +=
    // <span style="animation: none; float: right; display: flex; align-items: center;" class="rightArrowAnimation">🢒</span>';
    '</div>';
}

function scrollItemsOnPlanetBackward(planet_name: string)
{
    let planet_items = planets[planet_name].getItems();
    let planet_items_length: number = Object.keys(planet_items).length;

    if(planetPopUpItemNum - 4 >= 0)
    {
        planetPopUpItemNum -= 4;
    }
    else
    {
        if(planet_items_length % 4 != 0)
            planetPopUpItemNum = planet_items_length -  planet_items_length % 4;
        else if(planet_items_length != 0)
            planetPopUpItemNum = planet_items_length - 4;
        else
            planetPopUpItemNum = 0;
    }

    displayScrolledItemsOnPlanet(planet_name);
}

function scrollItemsOnPlanetForward(planet_name: string)
{
    let planet_items = planets[planet_name].getItems();

    if(planetPopUpItemNum + 4 < Object.keys(planet_items).length)
    {
        planetPopUpItemNum += 4;
    }
    else
    {
        planetPopUpItemNum = 0;
    }

    displayScrolledItemsOnPlanet(planet_name);
}

function displayScrolledItemsOnPlanet(planet_name: string)
{
    if(planet_name == undefined || planet_name == "" || planets[planet_name] == undefined)
    {
        console.log("Inappropriate planet name in request for scrolling items on planet: " + planet_name);
        return;
    }

    let planetPopUp = document.getElementById("planetPopUp");

    let planet_items = planets[planet_name].getItems();

    planetPopUp.getElementsByClassName('itemsHolder')[0].innerHTML =
        '<div class="item">Items</div>\
         <div class="upArrow" onclick="scrollItemsOnPlanetForward(\'' + escapeRegExp(planet_name) + '\')">⌃</div>\
        ';

    let k = 0;
    for(let i in planet_items)
    {
        if(k < planetPopUpItemNum) k++;
        else if(k++ < planetPopUpItemNum + 4)
        {
            planetPopUp.getElementsByClassName("itemsHolder")[0].innerHTML +=
            '<div class="item">\
                <div class="itemImage">\
                    <img src="/static/Images/' + planet_items[i].getName() + '">\
                </div>\
                <span class="itemName">' + planet_items[i].getName() + '</span>\
                <span class="itemBuyPrice">' + planet_items[i].getBuyPriceAsString() + '</span>\
                <span class="itemSellPrice">' + planet_items[i].getSellPriceAsString() + '</span>\
                <span class="itemAmount">' + planet_items[i].getAmountAsString() + '</span>\
            </div>\
            ';
        }
        else break;
    }

    for(k; k < planetPopUpItemNum + 4; k++)   // filling empty spaces
    {
        planetPopUp.getElementsByClassName("itemsHolder")[0].innerHTML += '<div class="item"></div>'
    }

    planetPopUp.getElementsByClassName('itemsHolder')[0].innerHTML +=
    '<div class="downArrow" onclick="scrollItemsOnPlanetBackward(\'' + escapeRegExp(planet_name) + '\')">⌄</div>';
}

/********************************** POP UP SHIP ******************************/

function displayShipLocation(ship_name: string)
{
    let shipPopUp = document.getElementById("shipPopUp");

    if(ships[ship_name].getLocation() != "" && planets[ships[ship_name].getLocation()] != undefined)
    {
        document.getElementById("shipLocationText").innerHTML = "";
        shipPopUp.getElementsByClassName("shipPopUpPlanetImage")[0].firstElementChild.setAttribute("src", "/static/Images/" + ships[ship_name].getLocation());
        shipPopUp.getElementsByClassName("shipLocationHolder")[0].firstElementChild.innerHTML = "[" + planets[ships[ship_name].getLocation()].getPositionAsString() + "]";
        document.getElementById('dockedAt').innerHTML = "Docked at: " + ships[ship_name].getLocation();
    }
    else
    {
        shipPopUp.getElementsByClassName("shipPopUpPlanetImage")[0].firstElementChild.setAttribute("src", "");
        document.getElementById('dockedAt').innerHTML = "Travelling";
    }
}

function popUpShip(ship_name: string)
{
    let shipPopUp = document.getElementById("shipPopUp");
    shipPopUp.style.display = "grid";

    shipPopUp.getElementsByClassName("shipName")[0].innerHTML = ship_name;
    shipPopUp.getElementsByClassName("shipImageHolder")[0].setAttribute("src", "/static/Images/" + ship_name);

    displayShipLocation(ship_name);
    
    displayCargo(ship_name);

    shipPopUp.getElementsByClassName("Collapsible")[0].setAttribute("onclick", "collapseOrDisplayTravelPanel('" + escapeRegExp(ship_name) + "')");
    document.getElementById("travelPlanetTable").style.display = "none";

    displayBuySellItems(ship_name, ships[ship_name].getLocation());

    shipPopUp.getElementsByClassName("shipPopUpPlanetImage")[0].setAttribute("onclick", "popUpPlanet(\"" + escapeRegExp(ships[ship_name].getLocation()) + "\")");

    closePlanetPopup();

    activateModal();
}

function scrollItemsOnShipForward(ship_name: string)
{
    let ship_items = ships[ship_name].getItems();

    if(shipPopUpItemNum + 4 < Object.keys(ship_items).length)
    {
        shipPopUpItemNum += 4;
    }
    else
    {
        shipPopUpItemNum = 0;
    }

    displayCargo(ship_name);
}

function scrollItemsOnShipBackward(ship_name: string)
{
    let ship_items = ships[ship_name].getItems();
    let ship_items_length: number = Object.keys(ship_items).length;

    if(shipPopUpItemNum - 4 >= 0)
    {
        shipPopUpItemNum -= 4;
    }
    else
    {
        if(ship_items_length % 4 != 0)
            shipPopUpItemNum = ship_items_length -  ship_items_length % 4;
        else if(ship_items_length != 0)
            shipPopUpItemNum = ship_items_length - 4;
        else
            shipPopUpItemNum = 0;
    }

    displayCargo(ship_name);
}


function displayCargo(ship_name: string)
{
    let shipPopUp = document.getElementById("shipPopUp");

    shipPopUp.getElementsByClassName('cargoHolder')[0].innerHTML =
        '<div class="item">Cargo [' + ships[ship_name].getCargoSize() + '/' + ships[ship_name].getMaximumCargoCapacity() + ']</div>\
         <div class="upArrow" onclick="scrollItemsOnShipForward(\'' + escapeRegExp(ship_name) + '\')">⌃</div>\
        ';

    let ship_items = ships[ship_name].getItems();

    let k = 0;
    for(let i in ship_items)
    {
        if(k < shipPopUpItemNum) k++;
        else if(k++ < shipPopUpItemNum + 4)
        {
            shipPopUp.getElementsByClassName("cargoHolder")[0].innerHTML +=
            '<div class="item">\
                <div class="itemImage">\
                    <img src="/static/Images/' + ship_items[i].getName() + '">\
                </div>\
                <span class="itemName">' + ship_items[i].getName() + '</span>\
                <span class="itemAmount">' + ship_items[i].getAmountAsString() + '</span>\
            </div>\
            ';
        }
        else break;
    }

    for(k; k < shipPopUpItemNum + 4; k++)   // filling empty spaces
    {
        shipPopUp.getElementsByClassName("cargoHolder")[0].innerHTML += '<div class="item"></div>'
    }

    shipPopUp.getElementsByClassName('cargoHolder')[0].innerHTML +=
    '<div class="downArrow" onclick="scrollItemsOnShipBackward(\'' + escapeRegExp(ship_name) + '\')">⌄</div>';
}

function displayBuySellItems(ship_name: string, planet_name: string)
{
    if(ships[ship_name].getLocation() != undefined && planets[ships[ship_name].getLocation()] != undefined)
    {
        document.getElementById("buySellHolder").style.display = "block";
    }

    let itemsTable = document.getElementById("shipPopUp").getElementsByClassName("itemTable")[0];

    let itemsString ='\
    <tr>\
        <th>Buy</th>\
        <th>Item</th>\
        <th>Image</th>\
        <th>Amount</th>\
        <th>Buy Price</th>\
        <th>Sell Price</th>\
        <th>Sell</th>\
    </tr>';

    if(planet_name == undefined || planets[planet_name] == undefined)
    {
        return;
    }

    else if(ship_name == undefined || ships[ship_name] == undefined) return;


    let available_items = planets[planet_name].getItems();
    for(let item_name in available_items)
    {
        itemsString +=
        '\
        <tr>\
            <td onclick="buyItem(\'' + ship_name + '\', \'' + item_name + '\', 1)">Buy</td>\
            <td>' + available_items[item_name].getName() + '</td>\
            <td><img class="shipItemImage" src=\'' + "/static/Images/" + available_items[item_name].getName() + '\'/></td>\
            <td>' + available_items[item_name].getAmountAsString() + '</td>\
            <td>' + planets[planet_name].getItemBuyPrice(item_name) + '</td>\
            <td>' + planets[planet_name].getItemSellPrice(item_name) + '</td>\
            <td onclick="sellItem(\'' + ship_name + '\', \'' + item_name + '\', 1)">Sell</td>\
        </tr>\
        ';
    }

    itemsTable.innerHTML = itemsString;
}

function buyItem(ship_name: string, item_name: string, item_amount: number)
{
    let errorMsg: string = ships[ship_name].buyItem(item_name, item_amount);
    if(errorMsg != "")
    {
        alert(errorMsg);
        return;
    }
    displayCredits();

    displayBuySellItems(ship_name, ships[ship_name].getLocation());
    displayCargo(ship_name);
}

function sellItem(ship_name: string, item_name: string, item_amount: number)
{
    let errorMsg: string = ships[ship_name].sellItem(item_name, item_amount);
    if(errorMsg != "")
    {
        alert(errorMsg);
        return;
    }
    displayCredits();

    displayBuySellItems(ship_name, ships[ship_name].getLocation());
    displayCargo(ship_name);
}

function arriveOnPlanet(ship_name: string, planet_name: string)
{
    let shipPopUp = document.getElementById("shipPopUp");
    if(shipPopUp.style.display != "none" && shipPopUp.getElementsByClassName("shipName")[0].innerHTML == ship_name)
    {
        document.getElementById("buySellHolder").style.display = "block";
        displayShipLocation(ship_name);

        displayBuySellItems(ship_name, ships[ship_name].getLocation());
    }

    let planetPopUp = document.getElementById("planetPopUp");
    if(planetPopUp.style.display != "none")
    {
        displayDockedShips(planet_name);
    }
}

function travelTo(planet_name: string, ship_name: string)
{
    if(ship_name == undefined || ships[ship_name] == undefined)
    {
        alert("Error, called travelTo with unknown ship name: " + ship_name);
    }

    let msg: string = ships[ship_name].travelTo(planet_name);
    
    if(msg != "")
    {
        alert(msg);
        return;
    }

    document.getElementById("shipPopUp").getElementsByClassName("shipPopUpPlanetImage")[0].firstElementChild.setAttribute("src", "");
    document.getElementById('dockedAt').innerHTML = "Travelling";
    document.getElementById("travelPlanetTable").style.display = "none";
    document.getElementById("buySellHolder").style.display = "none";
    document.getElementById("shipLocationText").innerHTML = "";
}

function displayTravelPanel(ship_name: string)
{
    let div = document.getElementById("shipPopUp").getElementsByClassName("tableBody")[0];

    let tableHTML: string = "";
    for(let planet_name in planets)
    {
        if(ships[ship_name].getLocation() != planet_name)
        {
            tableHTML +=
            "<tr onclick=\"travelTo(\'" + escapeRegExp(planet_name) + "\', \'" + escapeRegExp(ship_name) +  "\')\">\
                <td>" + planet_name + "</td>\
                <td>[" + planets[planet_name].getPositionAsString() + "]</td>\
                <td>" + (ships[ship_name].getLocation() == "" ? "Unknown" : ships[ship_name].howLongTo(planet_name)) + "</td>\
             </tr>\
            ";
        }
    }

    div.innerHTML = tableHTML;
}

function collapseOrDisplayTravelPanel(ship_name: string)
{
    if(document.getElementById("travelPlanetTable").style.display != "block")
    {
        displayTravelPanel(ship_name);
        document.getElementById("travelPlanetTable").style.display = "block";
    }
    else
    {
        document.getElementById("travelPlanetTable").style.display = "none";
    }
}

/********************************** ENDGAME **********************************/

function openAndAlterHighScoresJson(url: string)
{
    let xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            let high_scores = JSON.parse(this.responseText);
            alterHighScores(high_scores);
        }
    };

    xmlhttp.open("GET", url, false);     // false if we want it synchronous
    xmlhttp.send();
}

function alterHighScores(high_scores: Object)
{
    let player_with_worst_score: string;
    let worst_high_score = 100000000000000;

    for(let player_name in high_scores)
    {
        if(high_scores[player_name] <= worst_high_score)
        {
            worst_high_score = high_scores[player_name];
            player_with_worst_score = player_name;
        }
    }

    if(worst_high_score < credits)
    {
        if(high_scores[current_player] == undefined) delete high_scores[player_with_worst_score];
     
        high_scores[current_player] = credits;

        let json_scores = JSON.stringify(high_scores);
        document.cookie = "high_scores=" + json_scores + ";";

        alert("Congratulations, you made it to high scores!");
    }
    else
    {
        alert("Game over");
    }
}

function endGame()
{
    let high_scores = getTheCookie("high_scores");
    
    if(high_scores != "")
    {
        high_scores = JSON.parse(high_scores);
        alterHighScores(high_scores);
    }
    else
    {
        openAndAlterHighScoresJson("initial/high_scores.json");
    }
    window.location.href = '/';
}

/********************************** USEFUL TOOLS *****************************/
function escapeRegExp(string: string)
{
    return string.replace(/[.*'"+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function getTheCookie(cname: string)
{
    var name = cname + "=";

    var decodedCookie = decodeURIComponent(document.cookie);

    var ca = decodedCookie.split(';');

    for(var i = 0; i < ca.length; i++)
    {
        var c = ca[i];
        while (c.charAt(0) == ' ')
        {
            c = c.substring(1);
        }
        
        if (c.indexOf(name) == 0)
        {
            return c.substring(name.length, c.length);
        }
    }

    return "";
}

function checkCookie(cookie_name: string): boolean
{
    var cookie = getTheCookie(cookie_name);
    
    return cookie != "";
}

function activateCollapsibles()
{
    let coll = document.getElementsByClassName("Collapsible");
    let i: number;

    for (i = 0; i < coll.length; i++)
    {
        coll[i].addEventListener("click",
        function() {
            this.classList.toggle("active");
            let content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            }
            else
            {
                content.style.display = "block";
            }
        });
    }
}

function displayCredits()
{
    document.getElementById("menuList").firstElementChild.nextElementSibling.innerHTML = "" + credits + "$";
}

function displayPlayer()
{
    // let url_params = new URLSearchParams(window.location.search);
    // current_player = url_params.get('nickname');
    // document.getElementById('nick').innerHTML = current_player;
    current_player = document.getElementById('nick').innerHTML;
    // current_player = document.getElementById('nick').innerHTML;
}

/********************************** GAME *************************************/
loadJson(document.getElementById("schema").innerHTML);
createObjectsFromJson();
displayPlanets();
displayShips();
displayCredits();
displayPlayer();

clock = new Clock(game_duration);