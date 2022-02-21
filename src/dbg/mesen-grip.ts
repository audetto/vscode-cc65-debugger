import { AbstractGrip } from "./abstract-grip";
import _random from 'lodash/fp/random'
import * as fs from 'fs'
import * as bin from './binary-dto'
import * as util from 'util'
import * as debugUtils from '../lib/debug-utils'
import * as debugFile from '../lib/debug-file'
import * as path from 'path'
import { __basedir } from '../basedir'
import getPort from 'get-port'
import _last from 'lodash/fp/last'
import * as pngjs from 'pngjs'

const mesenBaseDir = __basedir + '/../dist/mesen';

export class MesenGrip extends AbstractGrip {
    private _isSnes: boolean;
    protected _apiVersion : number = 2;
    private _png : any;
    private _binaryPort : number = -1;
    private _mesenPath : string = '';
    private _args : string[] = [];
    private _opts : debugUtils.ExecFileOptions = {};

    constructor(
        isSnes: boolean,
        execHandler: debugUtils.ExecHandler,
    ) {
        super(execHandler);

        this._isSnes = isSnes;
        this._execHandler = execHandler;
    }

    public async connect(binaryPort: number) : Promise<void> {
        this._binaryConn = await AbstractGrip._connect(binaryPort, this._binaryDataHandler.bind(this));
    }

    public async autostart(program: string) : Promise<void> {
        try {
            const args = [this._mesenPath, ...this._args, program];

            let command : string;
            if(process.platform == 'win32') {
                command = __basedir + '/../dist/mintty/bin_win32_' + process.arch + '/mintty';
                command = path.normalize(command);
            }
            else {
                command = 'mono';
                if(process.env.USE_XVFB) {
                    args.unshift(command);
                    /*
                    args.unshift(mesenBaseDir + '/xvfb-wrapper.sh');
                    args.unshift('bash');
                    */
                    args.unshift('-a');
                    command = 'xvfb-run';
                }
            }

            console.log('Starting Mesen', command, JSON.stringify(args));
            this._pids = await this._execHandler(command, args, this._opts);
        }
        catch {
            throw new Error(`Could not start Mesen with "${this._mesenPath} ${this._args.join(' ')}". Make sure your settings are correct.`);
        }

        await this.connect(this._binaryPort);
    }

    public async displayGetRGBA() : Promise<bin.DisplayGetResponse> {
        const res = await this.execBinary({
            type: bin.CommandType.displayGet,
            useVicII: false,
            format: bin.DisplayGetFormat.RGBA,
        });

        if(!this._png) {
            this._png = new pngjs.PNG();
        }

        try {
            const data = await util.promisify(this._png.parse.bind(this._png))(res.rawImageData)

            return {
                ...res,
                rawImageData: data.data,
            }
        }
        catch {
            // FIXME
            return res;
        }
    }

    public async start(port: number, cwd: string, machineType: debugFile.MachineType, preferX64OverX64sc?: boolean, viceDirectory?: string, mesenDirectory?: string, emulatorArgs?: string[], labelFile?: string) : Promise<void> {
        let mesenSettingsDir =
            process.env.USERPROFILE
            // FIXME This shouldn't assume the Documents folder location
            ? process.env.USERPROFILE + '/Documents/Mesen'
            : process.env.HOME + '/Mesen';

        try {
            await fs.promises.mkdir(mesenSettingsDir);
        }
        catch(e) {
            console.error(e);
        }

        try {
            await fs.promises.copyFile(mesenBaseDir + '/settings.xml', mesenSettingsDir + '/settings.xml');
        }
        catch(e) {
            console.error(e);
        }

        this._opts = {
            shell: false,
            env: {
                MESEN_REMOTE_HOST: '127.0.0.1',
                MESEN_REMOTE_BASEDIR: mesenBaseDir,
                MESEN_REMOTE_WAIT: '1',
            },
            cwd: cwd,
            title: 'Mesen',
        };

        this._mesenPath = await this._getEmulatorPath(machineType, viceDirectory, mesenDirectory, preferX64OverX64sc);

        let args = [
            mesenBaseDir + '/mesen_binary_monitor.lua',
        ];

        this._binaryPort = await getPort({port: getPort.makeRange(port, port + 256)});

        this._opts.env!.MESEN_REMOTE_PORT = this._binaryPort.toString()

        if(emulatorArgs) {
            args = [...emulatorArgs, ...args];
        }
        else {
            args = [...args];
        }

        this._args = args;
    }
}
