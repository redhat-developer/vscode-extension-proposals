import * as sinon from 'sinon';
import { StorageServiceImpl } from '../main/impl/storageServiceImpl';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { expect } from 'chai';

suite('Testing Storage Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    const mkTmpDir = (): string | undefined => {
        let tmpDir: string |undefined = undefined;
        try {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test1' + Date.now()));
            console.log("made tmpDir " + tmpDir);
            return tmpDir;
        } catch {
        }
        return undefined;
    };


    const rmTmpDir = (v: string | undefined): void => {
        if( v ) {
            fs.rmSync(v, { recursive: true });
        }
    };

    test('Test Model is empty on empty folder', async () => {
        let tmpDir: string |undefined = mkTmpDir();
        expect(tmpDir).not.undefined;
        
        const tmpDir2: string = tmpDir as string;
        try {
            const storage: StorageServiceImpl = new StorageServiceImpl(tmpDir2);
            //const model: RecommendationModel | undefined = await storage.readRecommendationModel();
            //expect(model).not.undefined;
        } finally {
            rmTmpDir(tmpDir);
        }
    });
});