import fs from 'fs';

import * as git from 'isomorphic-git';

import { GitEnvironmentInfo } from './GitEnvironmentInfo';

export let gitEnvironmentInfo: GitEnvironmentInfo;

export const init = async () => {

    let repoURL: string;
    let repoName: string;
    let branch: string;
    let commitHash: string;
    let commitMessage: string;

    try {
        const gitroot = await git.findRoot({
            fs,
            filepath: __dirname,
        });

        if (!gitroot) {
            return;
        }

        commitHash = await git.resolveRef({ fs, dir: gitroot, ref: 'HEAD' });

        const [
            REPOURL,
            COMMITOBJECT,
            BRANCHNAME,
        ] = await Promise.all([
            git.getConfig({
                fs,
                dir: gitroot,
                path: 'remote.origin.url',
            }),
            git.readCommit({ fs, dir: gitroot, oid: commitHash }),
            git.currentBranch({
                fs,
                dir: gitroot,
                fullname: false,
            }),
        ]);

        repoURL = REPOURL;
        repoName = REPOURL ? REPOURL.split('/').pop().split('.').shift() : '';
        branch = BRANCHNAME ? BRANCHNAME : '';
        commitMessage = COMMITOBJECT && COMMITOBJECT.commit ? COMMITOBJECT.commit.message : '';

        gitEnvironmentInfo = new GitEnvironmentInfo(
            repoURL,
            repoName,
            branch,
            commitHash,
            commitMessage,
        );
    } catch (error) {

        console.error(error);
        // todo: log erro in here
    }

    return gitEnvironmentInfo;
};
