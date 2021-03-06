/* eslint react/no-multi-comp: 0, react/prop-types: 0 */
import React from 'react';
import {Button, Popover, PopoverBody, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem} from 'reactstrap';
import Popper from 'popper.js';
import {CloudLoginModal} from './CloudLoginModal';
import {Firebase} from '../../firebase/Firebase';
import * as firebase from '../../firebase/lib/firebase';
import {FirebaseUIAuth} from '../../firebase/FirebaseUIAuth';
import {Logger} from '../../logger/Logger';
import {PersistenceLayerManager} from '../../datastore/PersistenceLayerManager';
import {CloudSyncOverviewModal} from './CloudSyncOverviewModal';
import {CloudSyncConfiguredModal} from './CloudSyncConfiguredModal';
import {RendererAnalytics} from '../../ga/RendererAnalytics';
import {Nav} from '../util/Nav';
import {InviteUsersModal} from './InviteUsersModal';
import {Invitations} from '../../datastore/Invitations';
import {SimpleTooltip} from '../tooltip/SimpleTooltip';

const log = Logger.create();

export class CloudAuthButton extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);

        this.enableCloudSync = this.enableCloudSync.bind(this);

        let stage: AuthStage | undefined;

        if (document.location!.hash === '#login') {
            stage = 'login';
        }

        if (document.location!.hash === "#configured") {
            stage = 'configured';
        }

        this.state = {
            mode: 'none',
            stage
        };

        log.info("auth state: ", this.state);

        Firebase.init();

        firebase.auth()
            .onAuthStateChanged((user) => this.onAuth(user),
                                (err) => this.onAuthError(err));

    }

    public render() {

        if (this.state.mode === 'needs-auth') {
            return (
                <div>

                    <Button id="enable-cloud-sync"
                            color="primary"
                            size="sm"
                            onClick={() => this.enableCloudSync()}>

                        <i className="fas fa-cloud-upload-alt" style={{marginRight: '5px'}}></i>

                        Enable Cloud Sync

                    </Button>

                    <SimpleTooltip target="enable-cloud-sync">
                        Cloud sync enables synchronizing your repository across
                        multiple computers.  Files are distributed in real time
                        and always up to date.
                    </SimpleTooltip>

                    <CloudLoginModal isOpen={this.state.stage === 'login'}
                                     onCancel={() => this.changeAuthStage()}/>


                    {/*<CloudSyncOverviewModal isOpen={this.state.stage === 'overview'}*/}
                                            {/*onCancel={() => this.changeAuthStage()}*/}
                                            {/*onSignup={() => this.changeAuthStage('login')}/>*/}

                </div>

            );

        } else if (this.state.mode === 'authenticated') {

            return (
                <div>

                    <CloudSyncConfiguredModal isOpen={this.state.stage === 'configured'}
                                              onCancel={() => this.changeAuthStage()}/>

                    <InviteUsersModal isOpen={this.state.stage === 'invite'}
                                      onCancel={() => this.changeAuthStage()}
                                      onInvite={(emailAddresses) => this.onInvitedUsers(emailAddresses)}/>

                    <UncontrolledDropdown direction="down"
                                          size="sm">

                        <DropdownToggle color="primary" caret>
                            <i className="fas fa-cloud-upload-alt" style={{marginRight: '5px'}}></i>

                            Cloud Sync
                        </DropdownToggle>
                        <DropdownMenu>
                            <DropdownItem id="cloud-sync-invite-users"
                                          size="sm"
                                          onClick={() => this.changeAuthStage('invite')}>

                                <i className="fas fa-user-plus mr-1"></i>

                                Invite Users

                                <SimpleTooltip target="cloud-sync-invite-users"
                                               show={0}
                                               placement="left">
                                    Invite users to Polar. If they sign up and
                                    use cloud sync we will give you a free month
                                    of cloud sync.
                                </SimpleTooltip>

                            </DropdownItem>
                            <DropdownItem divider />

                            <DropdownItem id="cloud-sync-logout"
                                          size="sm"
                                          onClick={() => this.logout()}
                                          className="text-danger">

                                <i className="fas fa-sign-out-alt mr-1"></i>

                                Logout

                                <SimpleTooltip target="cloud-sync-logout"
                                               show={0}
                                               placement="left">

                                    Logout of cloud sync. Your data will no
                                    longer be synchronized between your devices.

                                </SimpleTooltip>

                            </DropdownItem>

                        </DropdownMenu>
                    </UncontrolledDropdown>

                </div>

            );

        } else {
            return (<div></div>);
        }

    }

    private logout() {

        this.props.persistenceLayerManager.reset();

        window.location.href = Nav.createHashURL('logout');
        window.location.reload();

    }

    private onInvitedUsers(emailAddresses: ReadonlyArray<string>) {

        const handleInvitedUsers = async () => {

            await Invitations.sendInvites(...emailAddresses);
            this.changeAuthStage();

        };

        handleInvitedUsers()
            .catch(err => log.error("Unable to invite users: ", err));

    }

    private enableCloudSync() {
        this.changeAuthStage('login');
    }

    private changeAuthStage(stage?: AuthStage) {

        if (stage === 'login') {
            window.location.href = 'http://localhost:8500/apps/repository/login.html';
            return;
        }

        if (stage) {

            RendererAnalytics.event({category: 'cloud', action: 'stage-' + stage});

            document.location!.hash = stage;

        } else {
            document.location!.hash = '';
        }

        this.setState({
            mode: this.state.mode,
            stage
        });

    }

    private onAuth(user: firebase.User | null) {

        let mode: AuthMode = 'needs-auth';

        if (user) {
            mode = 'authenticated';
        }

        this.setState({
              mode,
          });

    }

    private onAuthError(err: firebase.auth.Error) {
        log.error("Authentication error: ", err);
    }

}

interface IProps {
    readonly persistenceLayerManager: PersistenceLayerManager;
}

interface IState {
    readonly mode: AuthMode;
    readonly stage?: AuthStage;
}

type AuthMode = 'none' | 'needs-auth' | 'authenticated';

type AuthStage = 'overview' | 'login' | 'configured' | 'invite';
