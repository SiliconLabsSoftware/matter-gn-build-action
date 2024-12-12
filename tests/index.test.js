const core = require('@actions/core');
const fs = require('fs');
const { execSync } = require('child_process');
const { run } = require('../index.js');

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('fs');
jest.mock('fs', () => ({
    readFile: jest.fn(), // Mock readFile here
    promises: {
        access: jest.fn(),
    },
    constants: {
        O_RDONLY: 0, // Mock the O_RDONLY constant
    },
}));
jest.mock('child_process');

describe('run', () => 
{
    beforeEach(() => 
    {
        jest.clearAllMocks();
    });

    it('should run the GitHub Action successfully', async () => 
    {
        const mockJsonData = {
            "exampleApp": [
                {
                    "boards": ["board1"],
                    "arguments": ["arg1", "arg2"]
                }
            ],
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        execSync.mockImplementation((command, options) => 
        {
            console.log('execSync called with:', command, options);
        });

        await run();
        
        expect(core.getInput).toHaveBeenCalledWith('json-file-path');
        expect(core.getInput).toHaveBeenCalledWith('example-app');
        expect(core.getInput).toHaveBeenCalledWith('build-script');
        expect(execSync).toHaveBeenCalledWith('build_script.sh board1 out/exampleApp arg1 arg2', { stdio: 'inherit' });
    });

    it('should handle error when reading JSON file', async () => 
    {
        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(new Error('File read error'), null);
        });

        await run();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error:'));
    });

    it('should handle error when parsing JSON file', async () => 
    {
        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, 'invalid json');
        });

        await run();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error:'));
    });

    it('should handle error when no build information is found for the example app', async () => 
    {
        const mockJsonData = {
            "anotherApp": [
                {
                    "boards": ["board1"],
                    "arguments": ["arg1", "arg2"]
                }
            ],
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        await run();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error: No build information found for exampleApp'));
    });

    it('should handle error during command execution', async () => 
    {
        const mockJsonData = {
            "exampleApp": [
                {
                    "boards": ["board1"],
                    "arguments": ["arg1", "arg2"]
                }
            ],
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        execSync.mockImplementation(() => 
        {
            throw new Error('Command execution error');
        });

        await run();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Build script failed with error: Command execution error'));
    });
});