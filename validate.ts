import { promisify } from 'util';
import * as fs from 'fs';

let open = promisify(fs.open);
let read = promisify(fs.read);

let validate = require('jsonschema').validate;

const json_schema = {
    "type": "object",
    "additionalProperties": false,
    "minProperties": 5,
    "properties": {
        "game_duration": { "type": "integer", "minimum": 0 },
        "initial_credits": { "type": "integer", "minimum": 0 },
        "items": {
            "type": "array",
            "minItems": 1,
            "maxItems": 20,
            "items": { "type": "string" }
        },
        "planets": {
            "type": "object",
            "additionalProperties": false,
            "minProperties": 1,
            "maxProperties": 20,
            "patternProperties": {
                "^.+$": {
                    "type": "object",
                    "additionalProperties": false,
                    "minProperties": 3,
                    "maxProperties": 22,
                    "properties": {
                        "available_items": {
                            "type": "object",
                            "additionalProperties": false,
                            "minProperties": 1,
                            "maxProperties": 20,
                            "patternProperties": {
                                "^.+$": {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "minProperties": 3,
                                    "properties": {
                                        "available": { "type": "integer", "minimum": 0 },
                                        "buy_price": { "type": "integer", "minimum": 0 },
                                        "sell_price": { "type": "integer", "minimum": 0 }
                                    }
                                }
                            }
                        },
                        "x": { "type": "integer", "minimum": 0, "maximum": 99 },
                        "y": { "type": "integer", "minimum": 0, "maximum": 99 }
                    }
                }
            }
        },
        "starships": {
            "type": "object",
            "additionalProperties": false,
            "minProperties": 1,
            "maxProperties": 20,
            "patternProperties": {
                "^.+$": {
                    "type": "object",
                    "additionalProperties": false,
                    "minProperties": 2,
                    "properties": {
                        "cargo_hold_size": { "type": "integer", "minimum": 0 },
                        "position": { "type": "string" }
                    }
                }
            }
        }
    }
}

function validateFile(file: string): Object {
    let json;
    let planets, ships: number;
    try {
        json = JSON.parse(file);
        let x = validate(json, json_schema);
        if(x.errors.length == 0 && check_ships_and_items(json))
        {
            planets = Object.keys(json["planets"]).length;
            ships = Object.keys(json["starships"]).length;
            return {"ships": ships, "planets": planets, "json": json};
        }
        else return undefined;
    }
    catch (error) {
        return undefined;
    }
}

function check_ships_and_items(json): boolean {
    for (let starship in json["starships"]) {
        if (json["planets"][json["starships"][starship]["position"]] == undefined) {
            return false;
        }
    }
    return true;
}

export { validateFile };