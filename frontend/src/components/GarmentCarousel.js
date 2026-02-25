// Carrusel de prendas — auto-deslizante con FlatList, full-width
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Image, Text, FlatList, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IMAGE_BASE_URL } from '../services/api';
import { useTheme } from '../hooks/useTheme';

const FALLBACK_WIDTH = Dimensions.get('window').width;
const AUTO_INTERVAL = 3500;

const GarmentCarousel = ({ garments = [], height = 300 }) => {
    const flatRef = useRef(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [itemWidth, setItemWidth] = useState(FALLBACK_WIDTH);
    const timerRef = useRef(null);
    const userDragging = useRef(false);
    const { theme } = useTheme();
    const c = theme.colors;

    const count = garments.length;

    const onContainerLayout = (e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - itemWidth) > 1) setItemWidth(w);
    };

    const stopAutoScroll = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startAutoScroll = useCallback(() => {
        stopAutoScroll();
        if (count <= 1) return;
        timerRef.current = setInterval(() => {
            if (userDragging.current) return;
            setActiveIdx((prev) => {
                const next = (prev + 1) % count;
                flatRef.current?.scrollToOffset({ offset: next * itemWidth, animated: true });
                return next;
            });
        }, AUTO_INTERVAL);
    }, [count, itemWidth, stopAutoScroll]);

    useEffect(() => {
        startAutoScroll();
        return () => stopAutoScroll();
    }, [startAutoScroll, stopAutoScroll]);

    const onScrollBeginDrag = () => {
        userDragging.current = true;
        stopAutoScroll();
    };

    const onMomentumScrollEnd = (e) => {
        userDragging.current = false;
        const idx = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
        setActiveIdx(idx);
        startAutoScroll();
    };

    const onScroll = (e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
        if (idx !== activeIdx) setActiveIdx(idx);
    };

    const getItemLayout = (_, index) => ({
        length: itemWidth, offset: itemWidth * index, index,
    });

    const renderSlide = ({ item: g, index: i }) => (
        <View style={[styles.slide, { width: itemWidth, height }]}>
            {g.image_url ? (
                <Image
                    source={{ uri: `${IMAGE_BASE_URL}${g.image_url}` }}
                    style={[styles.img, { height }]}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.placeholder, { height, backgroundColor: c.surfaceVariant }]}>
                    <Ionicons name="shirt-outline" size={48} color={c.textMuted} />
                    <Text style={[styles.placeholderName, { color: c.textMuted }]} numberOfLines={1}>
                        {g.name}
                    </Text>
                </View>
            )}
            <View style={styles.overlay}>
                <Text style={styles.overlayText} numberOfLines={1}>{g.name}</Text>
                {g.category && (
                    <Text style={styles.overlayCategory}>{g.category}</Text>
                )}
            </View>
        </View>
    );

    if (count === 0) return null;

    return (
        <View onLayout={onContainerLayout}>
            <FlatList
                ref={flatRef}
                data={garments}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                onScroll={onScroll}
                onScrollBeginDrag={onScrollBeginDrag}
                onMomentumScrollEnd={onMomentumScrollEnd}
                scrollEventThrottle={64}
                decelerationRate="fast"
                keyExtractor={(g, i) => g.id?.toString() || i.toString()}
                getItemLayout={getItemLayout}
                renderItem={renderSlide}
                snapToInterval={itemWidth}
                snapToAlignment="start"
            />

            {count > 1 && (
                <View style={styles.dots}>
                    {garments.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                { backgroundColor: i === activeIdx ? c.primary : c.textMuted + '50' },
                            ]}
                        />
                    ))}
                </View>
            )}

            {count > 1 && (
                <View style={styles.counter}>
                    <Text style={styles.counterText}>{activeIdx + 1}/{count}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    slide: { justifyContent: 'center', alignItems: 'center' },
    img: { width: '100%' },
    placeholder: { width: '100%', justifyContent: 'center', alignItems: 'center' },
    placeholderName: { fontSize: 14, marginTop: 8 },
    overlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    overlayText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    overlayCategory: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'capitalize', marginTop: 1 },
    dots: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        paddingVertical: 8, gap: 6,
    },
    dot: { width: 7, height: 7, borderRadius: 3.5 },
    counter: {
        position: 'absolute', top: 10, right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    counterText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});

export default GarmentCarousel;
