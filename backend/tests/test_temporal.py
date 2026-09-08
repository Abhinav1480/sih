import pytest
from app.utils.temporal import parse_temporal_context

def test_tomorrow_morning():
    t = parse_temporal_context("Is it safe tomorrow morning near Visakhapatnam?")
    assert t.is_forecast is True
    assert t.is_historical is False
    assert "Tomorrow Morning" in t.label
    assert t.offset_hours > 0

def test_last_24_hours():
    t = parse_temporal_context("What changed in sea conditions over the last 24 hours?")
    assert t.is_historical is True
    assert t.is_forecast is False
    assert "Last 24 Hours" in t.label
    assert t.offset_hours == -24

def test_seven_days_ago():
    t = parse_temporal_context("Compare SST today vs 7 days ago near Chennai")
    assert t.is_historical is True
    assert "Past 7 Days" in t.label

def test_now_default():
    t = parse_temporal_context("Show current wave height near Kakinada")
    assert t.is_historical is False
    assert t.offset_hours == 0
