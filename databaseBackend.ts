import * as sqlite3 from 'sqlite3';

let crypto = require('crypto');

function createUserTable() {
    sqlite3.verbose();
    let db = new sqlite3.Database('base.db');

    db.run('CREATE TABLE IF NOT EXISTS users (\
        username TEXT PRIMARY KEY,\
        password TEXT NOT NULL,\
        salt TEXT NOT NULL\
    );');
    db.close();
}

function createJsonTable() {
    sqlite3.verbose();
    let db = new sqlite3.Database('base.db');

    db.run('CREATE TABLE IF NOT EXISTS jsons (\
        name TEXT PRIMARY KEY,\
        json TEXT NOT NULL,\
        planets INTEGER NOT NULL,\
        ships INTEGER NOT NULL\
        );');

    db.close();
}

function prepareDatabase() {
    createUserTable();
    createJsonTable();
}

function addUser(username: string, password: string, done) {
    sqlite3.verbose();
    let db = new sqlite3.Database('base.db');

    let salt: string = crypto.randomBytes(16).toString('hex');
    db.run('INSERT INTO users VALUES (?, ?, ?);', username, hashPassword(password, salt), salt, function (err) {
        db.close();
        if (err) {
            return done(null, false, { message: 'Username already taken' });
        }
        else {
            return done(null, false, { message: 'User added, now login please' });
        }
    });
}

function addJson(name: string, json: string, planets: number, ships: number): Promise<boolean> {
    sqlite3.verbose();
    let db = new sqlite3.Database('base.db');

    return new Promise<boolean>((resolve, reject) => {
        db.run('INSERT INTO jsons VALUES (?, ?, ?, ?);', name, json, planets, ships, function (err) {
            db.close();
            if (!err) resolve(true);
            else {
                reject("That name's already taken, please choose another one");
            }
        });
    });
}

function getGameSchemas() : Promise<Object>
{
    sqlite3.verbose();
    let db = new sqlite3.Database('base.db');
    
    return new Promise<Object>((resolve, reject) => {
        let data = db.all('SELECT name, ships, planets FROM jsons;', function(err, rows) {
            if(err)
            {
                reject(err);
            }
            else resolve(rows);
        });
    });
}

function getGameSchema(name: string) : Promise<string>
{
    sqlite3.verbose();
    let db = new sqlite3.Database('base.db');

    return new Promise<string>((resolve, reject) => {
        db.get('SELECT json FROM jsons WHERE name = ?;', name, function(err, row) {
            if(err || !row)
            {
                if(err) reject(err);
                else reject('no such file');
            }
            else resolve(row.json);
        });
    });
}

function hashPassword(password: string, salt: string): string {
    let hash = crypto.createHash('sha256');
    hash.update(password);
    hash.update(salt);
    return hash.digest('hex');
}

function logIn(username: string, password: string, done) {
    let db = new sqlite3.Database('base.db');

    db.get('SELECT salt, password FROM users WHERE username = ?;', username, function (err, row) {
        if (err) return done(err);

        if (!row) return done(null, false, { message: 'Incorrect username' });

        let hash = hashPassword(password, row.salt);

        db.get('SELECT username FROM users WHERE username = ? AND password = ?', username, hash, function (err, row) {
            if (err || !row) {
                return done(null, false, { message: 'Incorrect password' });
            }
            return done(null, row);
        });
    });
}

export { prepareDatabase, addUser, logIn, addJson, getGameSchemas, getGameSchema }