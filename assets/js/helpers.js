if(typeof module === 'object'){
    window.module = module;
    module = undefined;
}
require('electron-connect').client.create();

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

var defaultEnv = {
    directory: ""
};