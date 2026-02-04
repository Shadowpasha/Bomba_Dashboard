'use client'

import React, { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { StyleSheetManager, ServerStyleSheet } from 'styled-components'

export default function StyledComponentsRegistry({
    children,
}: {
    children: React.ReactNode
}) {
    // [Node.js execution] 
    // We should only use the registry on the server
    const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet())

    useServerInsertedHTML(() => {
        const styles = styledComponentsStyleSheet.getStyleElement()
        styledComponentsStyleSheet.instance.clearTag()
        return <>{styles}</>
    })

    if (typeof window !== 'undefined') return <>{children}</>

    return (
        <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
            {children}
        </StyleSheetManager>
    )
}
