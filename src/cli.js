#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import * as fs from 'fs';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(os.homedir(), '.openai') })

const program = new Command();

const API_URL = 'https://api.openai.com/v1/chat/completions';

const DEFAULT_CONFIG_PATH = path.resolve(os.homedir(), '.openai');

const loadApiKeyFromEnv = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error('Error: API key not provided. Add API Key using: npai -k <apiKey>');
    process.exit(1);
  }
  return apiKey;
};

const validateCommand = (command) => {
  if (!command) {
    console.error('Error: Command not provided');
    process.exit(1);
  }
};

const generateChatGPTResponse = async (content, apiKey) => {

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  
  const data = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Translate my input into npm commands, reduce your respond to only the commands in json format array, no explanations, no text. If you dont find commands in the msg then return empty. If I ask you to create a folder all the next commands should be start with "cd <name_of_folder> &&" also if you use create-react-app <name_of_folder>.' },
      { role: 'user', content }
    ]
  };
  
  try {
    const response = await axios.post(
      API_URL,
      data,
      { headers }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating ChatGPT response:', error);
    process.exit(1);
  }
};

const writeApiKeyToEnv = (apiKey, configPath) => {
  const envData = `API_KEY=${apiKey}\n`;

  try {
    fs.writeFileSync(configPath, envData);
    console.log(`API key written to ${configPath}`);
  } catch (error) {
    console.error('Error writing API key to env file:', error);
    process.exit(1);
  }
}

const run = async (command, apiKey) => {
  validateCommand(command);
  const response = await generateChatGPTResponse(command, apiKey);
  const commands = ((str) => {
    try {
      return JSON.parse(str);
    } catch (error) {
      return [];
    }
  })(response);

function runInBackground(command) {
  exec(command, (error, stdout) => {
    if (error) {
      console.error(`Error executing command: ${error}`);
      return;
    }
    console.log(stdout);
  });
  console.log('Done')
}

function promptUser(items) {
  if (items.length === 0) {
    console.log('No commands founded in your message');
    return;
  }
console.log(items)
  const prompt = {
    type: 'list',
    name: 'selectedItem',
    message: 'Select a command to execute:',
    choices: items.concat(new inquirer.Separator(), 'Exit'),
  };

  inquirer
    .prompt(prompt)
    .then((answer) => {
      const selectedItem = answer.selectedItem;

      if (selectedItem === 'Exit') {
        console.log('Bye 👋');
        return;
      }

      console.log(`✅ ${selectedItem}`);
      const remainingItems = items.filter((item) => item !== selectedItem);
      runInBackground(selectedItem);
      promptUser(remainingItems);
    })
    .catch((error) => {
      console.error('Error occurred:', error);
    });
}

promptUser(commands);
};

program
  .version('1.0.0')
  .description("NPAI, Effortless NPM Command Mastery with AI. Say it, and we'll make it happen!")
  .option('-k, --apiKey <apiKey>', 'API key')
  .arguments('[command]')
  .action(command => {
    program.command = command;
  })
  .parse(process.argv);

const options = program.opts();

if (options.apiKey) {
  writeApiKeyToEnv(options.apiKey, DEFAULT_CONFIG_PATH);
}

if (options.command || program.command) {
  const apiKey = loadApiKeyFromEnv();
  const command = options.command || program.command;
  run(command, apiKey);
}
