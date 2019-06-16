export class Position
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

export class Item
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

export class QuantityItem extends Item
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

export class SellableItem extends QuantityItem
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

export class Starship
{
    private name: string;
    private maximum_cargo_hold_size: number;
    private cargo_size: number = 0;
    private current_planet_name: string;
    private speed: number;
    private items: Object;

    public constructor(name: string, cargo_hold_size: number, current_planet_name: string, items: Object)
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

        if(this.cargo_size > this.maximum_cargo_hold_size) console.log("Ship " + this.getName() + " has cargo overload on constructor!!!");
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

export class Planet
{
    private name: string;
    private items: Object;
    private position: Position;

    public constructor(name: string, items: Object, position: Position)
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