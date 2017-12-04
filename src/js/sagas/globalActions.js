import { take, put, call, fork, select, takeEvery, all } from 'redux-saga/effects'
import * as actions from '../actions/globalActions'
import { fetchRatePromise } from "../services/rate"
import { Rate, updateAllRatePromise } from "../services/rate"
import { push } from 'react-router-redux';
import { addTranslationForLanguage, setActiveLanguage, getActiveLanguage } from 'react-localize-redux';

export function* getLatestBlock(action) {
  const ethereum = action.payload
  const block = yield call(ethereum.call("getLatestBlock"))
  yield put(actions.updateBlockComplete(block))
}

export function* updateHistoryExchange(action) {
  const { ethereum, page, itemPerPage, isAutoFetch } = action.payload
  var latestBlock = yield call(ethereum.call("getLatestBlock"))
  const newLogs = yield call(ethereum.call("getLogTwoColumn"), page, itemPerPage)
  const eventsCount = yield call(ethereum.call("countALlEvents"))
  yield put(actions.updateHistory(newLogs, latestBlock, page, eventsCount, isAutoFetch))
}

export function* updateRate(action) {
  const { ethereum, source, reserve, ownerAddr } = action.payload
  const rate = new Rate(
    source.name,
    source.symbol,
    source.icon,
    source.address,
    source.decimal
  )
  yield [
    rate.fetchRate(ethereum, reserve),
    rate.updateBalance(ethereum, ownerAddr)
  ]
  yield put(actions.updateRateComplete(rate))
}



export function* goToRoute(action) {
  yield put(push(action.payload));
}

export function* clearSession(action) {
  yield put(actions.clearSessionComplete())
  yield put(actions.goToRoute('/'));
}

export function* updateAllRate(action) {
  const { ethereum, tokens, reserve, ownerAddr } = action.payload
  let isUpdateBalance = ownerAddr ? true : false
  const rates = yield call(updateAllRatePromise, ethereum, tokens, reserve, ownerAddr)
  yield put(actions.updateAllRateComplete(rates, isUpdateBalance))
}

export function* changelanguage(action){
  const { ethereum, lang } = action.payload
  try{
    const languagePack = yield call(ethereum.call("getLanguagePack"), lang)
    yield put.sync(addTranslationForLanguage(languagePack, lang))
    yield put(setActiveLanguage(lang))
  } catch(err){
    console.log("++++++ get language pack err")
    console.log(err)
  }
  
}

export function* watchGlobal() {
  yield takeEvery("GLOBAL.NEW_BLOCK_INCLUDED_PENDING", getLatestBlock)
  yield takeEvery("GLOBAL.RATE_UPDATED_PENDING", updateRate)
  yield takeEvery("GLOBAL.GO_TO_ROUTE", goToRoute)
  yield takeEvery("GLOBAL.CLEAR_SESSION", clearSession)
  yield takeEvery("GLOBAL.RATE_UPDATE_ALL_PENDING", updateAllRate)
  yield takeEvery("GLOBAL.UPDATE_HISTORY_EXCHANGE", updateHistoryExchange)
  yield takeEvery("GLOBAL.CHANGE_LANGUAGE", changelanguage)
}


