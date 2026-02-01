package common

func AmountToLowestUnit(amount float64) int32 {
	return int32(amount * 100)
}

func LowestUnitToAmount(paisa int32) float64 {
	return float64(paisa) / 100.0
}
