import React from "react"
import { connect } from "react-redux"
import * as ethUtil from 'ethereumjs-util'

import constants from "../../services/constants"

import * as validators from "../../utils/validators"
import * as converters from "../../utils/converter"

import * as transferActions from "../../actions/transferActions"

import {PassphraseModal, ConfirmTransferModal} from "../../components/Transaction"

import { Modal } from "../../components/CommonElement"

@connect((store, props) => {
  const tokens = store.tokens
  const tokenSymbol = store.transfer.tokenSymbol
  var balance = 0
  if (tokens[tokenSymbol]) {
    balance = tokens[tokenSymbol].balance
  }
  return {
    account: store.account.account,
    transfer: store.transfer,
    form: { ...store.transfer, balance },
    ethereum: store.connection.ethereum
  };

})


export default class PostTransfer extends React.Component {
  clickTransfer = () => {
    if (this.validateTransfer()) {
      //check account type
      switch (this.props.account.type) {
        case "keystore":
          this.props.dispatch(transferActions.openPassphrase())
          break
        case "trezor":
        case "ledger":
          this.processTx()
          break
      }

    }
  }
  validateTransfer = () => {
    //check dest address is an ethereum address
    //console.log(validators.verifyAccount(this.props.form.destAddress))
    if (validators.verifyAccount(this.props.form.destAddress) !== null) {
      this.props.dispatch(transferActions.throwErrorDestAddress("This is not an address"))
      return false
    }
    if (isNaN(this.props.form.amount)) {
      this.props.dispatch(transferActions.thowErrorAmount("amount must be a number"))
      return false
    }
    else if (parseFloat(this.props.form.amount) > parseFloat(converters.toT(this.props.form.balance, 8))) {
      this.props.dispatch(transferActions.thowErrorAmount("amount is too high"))
      return false
    }
    return true
  }

  content = () => {
    return (
      <PassphraseModal recap={this.createRecap()}
          onChange = {this.changePassword}
          onClick = {this.processTx}
          passwordError={this.props.form.errors.passwordError} />
    )
  }
  contentConfirm = () => {
    return (
      <ConfirmTransferModal recap={this.createRecap()}
                    onCancel={this.closeModal}
                    onExchange = {this.broacastTx} />
      
    )
  }
  broacastTx = () => {
    const id = "transfer"
    const ethereum = this.props.ethereum
    const tx = this.props.form.txRaw
    const account = this.props.account
    var data = this.recap()
    this.props.dispatch(transferActions.doTransaction(id, ethereum, tx, account, data))
  }
  createRecap = () => {
    var form = this.props.form;
    return `transfer ${form.amount.toString().slice(0, 7)}${form.amount.toString().length > 7 ? '...' : ''} ${form.tokenSymbol} to ${form.destAddress.slice(0, 7)}...${form.destAddress.slice(-5)}`
  }

  recap = () => {
    var amount = this.props.form.amount.toString();
    var tokenSymbol = this.props.form.tokenSymbol;
    var destAddress = this.props.form.destAddress;
    return {
      amount, tokenSymbol, destAddress
    }
  }
  closeModal = (event) => {
    switch (this.props.account.type) {
      case "keystore":
        this.props.dispatch(transferActions.hidePassphrase())
        break
      case "trezor":
      case "ledger":
        this.props.dispatch(transferActions.hideConfirm())
        break
    }

  }
  changePassword = (event) => {
    this.props.dispatch(transferActions.changePassword())
  }
  formParams = () => {
    var selectedAccount = this.props.account.address
    var token = this.props.form.token
    var amount = converters.numberToHex(toTWei(this.props.form.amount))
    var destAddress = this.props.form.destAddress
    var throwOnFailure = this.props.form.throwOnFailure
    var nonce = validators.verifyNonce(this.props.account.getUsableNonce())
    // should use estimated gas
    var gas = converters.numberToHex(this.props.form.gas)
    // should have better strategy to determine gas price
    var gasPrice = converters.numberToHex(gweiToWei(this.props.form.gasPrice))
    return {
      selectedAccount, token, amount, destAddress,
      throwOnFailure, nonce, gas, gasPrice
    }
  }

  processTx = (event) => {
    try {
      var password = ""
      if (this.props.account.type === "keystore") {
        password = document.getElementById("passphrase").value
        document.getElementById("passphrase").value = ''
      }
      const params = this.formParams()
      //console.log(params)
      //return
      // sending by wei
      var account = this.props.account
      var ethereum = this.props.ethereum

      //var call = params.token == constants.ETHER_ADDRESS ? sendEtherFromAccount : sendTokenFromAccount

      //var dispatch = this.props.dispatch
      //var sourceAccount = account
      var formId = "transfer"
      var data = this.recap()
      this.props.dispatch(transferActions.processTransfer(formId, ethereum, account.address,
        params.token, params.amount,
        params.destAddress, params.nonce, params.gas,
        params.gasPrice, account.keystring, account.type, password, account, data))

      // var formId = "transfer"
      // call(
      //   formId, ethereum, account.address,
      //   params.token, params.amount,
      //   params.destAddress, params.nonce, params.gas,
      //   params.gasPrice, account.keystring, account.type, password, (ex, trans) => {
      //     this.runAfterBroacastTx(ex, trans)
      //     dispatch(finishTransfer())

      //     // const tx = new Tx(
      //     //   ex, account.address, ethUtil.bufferToInt(trans.gas),
      //     //   weiToGwei(ethUtil.bufferToInt(trans.gasPrice)),
      //     //   ethUtil.bufferToInt(trans.nonce), "pending", "send", {
      //     //     sourceToken: params.token,
      //     //     sourceAmount: params.amount,
      //     //     destAddress: params.destAddress,
      //     //   })
      //     // dispatch(incManualNonceAccount(account.address))
      //     // dispatch(updateAccount(ethereum, account))
      //     // dispatch(addTx(tx))
      //   })
      //document.getElementById("passphrase").value = ''
      //dispatch(finishTransfer())
    } catch (e) {
      console.log(e)
      this.props.dispatch(transferActions.throwPassphraseError("Key derivation failed"))
      //errors["passwordError"] = e.message
    }
  }
  // runAfterBroacastTx = (ex, trans) => {
  //   const account = this.props.account
  //   const params = this.formParams()
  //   const ethereum = this.props.ethereum
  //   const dispatch = this.props.dispatch
  //   var recap = this.createRecap()
  //   const tx = new Tx(
  //     ex, account.address, ethUtil.bufferToInt(trans.gas),
  //     weiToGwei(ethUtil.bufferToInt(trans.gasPrice)),
  //     ethUtil.bufferToInt(trans.nonce), "pending", "send", this.recap())
  //   dispatch(incManualNonceAccount(account.address))
  //   dispatch(updateAccount(ethereum, account))
  //   dispatch(addTx(tx))
  // }
  render() {
    var modalPassphrase = this.props.account.type === "keystore" ? (
      <Modal
        className={{base: 'reveal tiny',
            afterOpen: 'reveal tiny'}}
        isOpen={this.props.form.passphrase}
        onRequestClose={this.closeModal}
        contentLabel="password modal"
        content={this.content()}
        type="passphrase"
      />
    ) : <Modal
        className={{base: 'reveal tiny',
            afterOpen: 'reveal tiny'}}
        isOpen={this.props.form.confirmColdWallet}
        onRequestClose={this.closeModal}
        contentLabel="confirm modal"
        content={this.contentConfirm()}
        type="passphrase"
      />
    return (
      <div class="row">
        <div class="column small-11 medium-10 large-9 small-centered text-center">
          <p class="note">Passphrase is needed for each transfer transaction</p><a class="button accent" href="#" data-open="passphrase-modal" onClick={this.clickTransfer}>Transfer</a>
        </div>
        {modalPassphrase}
      </div>
      // <div>
      //   <button onClick={this.clickTransfer}>Transfer</button>
      //   {modalPassphrase}
      // </div>
    )
  }
}