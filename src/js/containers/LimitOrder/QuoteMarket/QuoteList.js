import React from "react"
export default class QuoteList extends React.Component{
  render() {
    const { currentQuote, quotes, onClick } = this.props
    return (
      <div id="quote_panel">
        { quotes.map(i => 
          <span key={i} className={currentQuote == i ? "active" :""} onClick={() => onClick(i)}>
            {i == "FAV" ? <div style={{display: 'inline-block'}} className={currentQuote == i  ? "star active" : "star" } />  : i}
          </span>)}
      </div>
    )
  }
}